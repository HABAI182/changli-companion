"""Preserve source changes and the verified native model between work stages."""
import argparse
import hashlib
import json
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
EVIDENCE = HERE / 'build/desktop-integration-20261005'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--note', required=True)
    parser.add_argument('--next', required=True)
    parser.add_argument('--version', type=int, default=28)
    parser.add_argument('--date', default='20261004')
    args = parser.parse_args()
    now = datetime.now().astimezone()
    version, date = args.version, args.date
    evidence = HERE / f'build/desktop-integration-{date}'
    evidence.mkdir(parents=True, exist_ok=True)
    source = HERE / f'build/ChangliReferenceRepair-v{version}-{date}.cmo3'
    core_report = HERE / f'build/reference-repair-v{version}-core-verification-{date}.json'
    core = json.loads(core_report.read_text(encoding='utf-8-sig'))
    if core.get('version') != version or not core.get('pass'):
        raise ValueError('This native version has no passed Core verification')
    provenance = json.loads((HERE / f'build/reference-repair-v{version}-provenance-{date}.json').read_text(encoding='utf-8-sig'))
    if sha(source) != provenance['authoringSha256']:
        raise ValueError('Verified native recovery source changed')
    for row in provenance['resources']:
        for base in (HERE / f'build/editor-export-reference-repair-v{version}-{date}',
                     ROOT / f'public/models/changli/live-reference-repair-v{version}-candidate'):
            if sha(base / row['path']) != row['sha256']:
                raise ValueError('Official/runtime resource changed: ' + row['path'])
    saved_source = evidence / f'ChangliReferenceRepair-v{version}-verified-native.cmo3'
    if saved_source.exists() and sha(saved_source) != sha(source):
        raise ValueError('Recovery source differs; do not overwrite')
    if not saved_source.exists():
        shutil.copy2(source, saved_source)
    working = HERE / f'ChangliReferenceRepair-v{version}-candidate.cmo3'
    entry = json.loads((ROOT / 'public/models/changli/model.json').read_text(encoding='utf-8-sig'))['renderer']['live2d']['entry']
    info = {'savedAt': now.isoformat(), 'goal': '正式长离 Live2D Windows 桌宠',
            'verifiedNativeSource': str(saved_source), 'verifiedNativeSha256': sha(source),
            'workingSourceSha256': sha(working), 'workingSourceMatchesVerified': sha(working) == sha(source),
            'note': args.note, 'next': args.next, 'formalArtComplete': False}
    info['modelEntry'] = entry
    info['appVersion'] = json.loads((ROOT / 'package.json').read_text(encoding='utf-8-sig'))['version']
    next_plan = HERE / 'build/v69-native-plan-20261009.json'
    if next_plan.exists():
        plan = json.loads(next_plan.read_text(encoding='utf-8'))
        candidate_version=plan.get('nextCandidateVersion',69)
        candidate = HERE / f'ChangliReferenceRepair-v{candidate_version}-candidate.cmo3'
        candidate_info = {'version': candidate_version, 'source': str(candidate),
            'sha256': sha(candidate), 'nativeEdited': sha(candidate) != plan['candidateSourceSha256'],
            'sourceMatchesPreparedPlan': sha(candidate) == plan['candidateSourceSha256'],
            'officialExportExists': (HERE / f'build/editor-export-reference-repair-v{candidate_version}-20261006/ChangliReferenceRepairV{candidate_version}.moc3').is_file(), 'historyPlan': str(next_plan)}
        info['nextNativeCandidate' if candidate_version > version else 'historicalNativeCandidate'] = candidate_info
    native_recovery_file = HERE / f'build/LATEST-RECOVERY-{date}.json'
    if native_recovery_file.exists():
        native_recovery = json.loads(native_recovery_file.read_text(encoding='utf-8-sig'))
        snapshot = HERE / native_recovery['latestWorkingSnapshot']
        if sha(snapshot) != native_recovery['workingSha256']:
            raise ValueError('Latest native working snapshot changed')
        info['nativeWorkingRecovery'] = native_recovery
        working_version = int(re.search(r'-v(\d+)-', snapshot.name)[1])
        working = HERE / f'ChangliReferenceRepair-v{working_version}-candidate.cmo3'
        if sha(working) != native_recovery['workingSha256']:
            raise ValueError('Current native work differs from the saved snapshot')
        info['nativeWorkingVersion'] = working_version
        info['workingSource'] = str(working)
        info['workingSourceSha256'] = sha(working)
        info['workingSourceMatchesVerified'] = sha(working) == sha(source)
    ui_report = HERE / f'build/pet-menu-ui-{date}/ui-verification.json'
    if not ui_report.exists():
        ui_report = HERE / 'build/pet-menu-ui-20261005/ui-verification.json'
    if ui_report.exists():
        ui = json.loads(ui_report.read_text(encoding='utf-8-sig'))
        matching_ui = bool(ui.get('sourceSha256')) and ui.get('appVersion') == info['appVersion'] and all(
            sha(ROOT / file) == digest for file, digest in ui.get('sourceSha256', {}).items())
        info['browserMenuUiPass'] = bool(ui.get('pass')) and matching_ui
        info['browserMenuUiSourceMatches'] = matching_ui
    native_ui_status = HERE / f'build/desktop-{info["appVersion"]}-ui-{date}/windows-verification-status.json'
    if native_ui_status.exists():
        info['nativeWindowsStatus'] = json.loads(native_ui_status.read_text(encoding='utf-8-sig'))
    report = HERE / f'build/desktop-v{version}-integration-{date}/runtime-chain.json'
    if not report.exists():
        report = HERE / (f'build/desktop-v{version}-integration-20261005/runtime-chain.json' if version >= 29 else 'build/desktop-integration-20261005/runtime-chain.json')
    if report.exists():
        runtime_chain = json.loads(report.read_text())
        info['historicalBrowserRuntimeChainPass'] = runtime_chain.get('pass', False)
        # A report for the same MOC3 does not validate changed adapter/input code.
        runtime_matches = runtime_chain.get('appVersion') == info['appVersion'] and bool(runtime_chain.get('sourceSha256')) and all(
            sha(ROOT / file) == digest for file, digest in runtime_chain.get('sourceSha256', {}).items())
        info['browserRuntimeChainPass'] = bool(runtime_chain.get('pass')) and runtime_matches
        info['browserRuntimeChainSourceMatches'] = runtime_matches
    input_report = HERE / 'build/input-blink-20261008/core-verification.json'
    input_status = HERE / 'build/input-blink-20261008/release-status.json'
    if input_report.exists():
        input_qa = json.loads(input_report.read_text(encoding='utf-8'))
        matches = input_qa.get('appVersion') == info['appVersion'] and bool(input_qa.get('sourceSha256')) and all(
            sha(ROOT / file) == digest for file, digest in input_qa.get('sourceSha256', {}).items())
        info['inputBlinkCorePass'] = bool(input_qa.get('pass')) and matches
        info['inputBlinkCoreSourceMatches'] = matches
    if input_status.exists():
        release_status = json.loads(input_status.read_text(encoding='utf-8'))
        info['currentReleaseStatus' if release_status.get('appVersion') == info['appVersion'] else 'historicalReleaseStatus'] = release_status
    browser_input_report = HERE / 'build/input-blink-20261008/verification.json'
    app_clock_report = HERE / 'build/app-animation-clock-20261011/verification.json'
    interactions_report = HERE / f'build/interactions-{info["appVersion"]}-20261011/verification.json'
    for name, check_path in (('inputBlinkBrowserSdkPass', browser_input_report), ('actualAppAnimationClockPass', app_clock_report), ('actualAppInteractionsPass', interactions_report)):
        if check_path.exists():
            check = json.loads(check_path.read_text(encoding='utf-8'))
            matches = check.get('appVersion') == info['appVersion'] and bool(check.get('sourceSha256')) and all(
                sha(ROOT / file) == digest for file, digest in check.get('sourceSha256', {}).items())
            info[name] = bool(check.get('pass')) and matches
    archive = evidence / f'implementation-checkpoint-{now:%Y%m%d-%H%M%S}.zip'
    files = [ROOT / p for p in ('package.json', 'package-lock.json', 'index.html',
        'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json', 'public/models/changli/model.json')]
    files += list((ROOT / 'src').rglob('*')) + list((ROOT / 'tests').rglob('*'))
    files += list((ROOT / 'src-tauri/src').rglob('*'))
    files += list((ROOT / 'src-tauri/capabilities').rglob('*'))
    files += list((ROOT / 'src-tauri/icons').rglob('*'))
    files += [ROOT / p for p in ('src-tauri/build.rs', 'tsconfig.json', 'vite.config.ts',
        '.prettierrc.json', '.prettierignore', '.gitignore', 'THIRD-PARTY-NOTICES.md')]
    files += [HERE / p for p in ('desktop-integration-preview.html', 'verify_desktop_integration.cjs',
        'save_desktop_progress.py', 'reference-hair-physics-qa.js', 'reference-repair-v2-preview.html',
        'verify_reference_repair.cjs', 'prepare_reference_repair_runtime.py', 'save_reference_repair_checkpoint.py')]
    files += [HERE / p for p in ('reference-repair-v29-preview.html', 'reference-repair-v29-checks.js', 'build_v29_review_page.py')]
    files += [HERE / p for p in ('reference-repair-v30-preview.html', 'reference-repair-v30-checks.js', 'build_v30_review_page.py', 'build_phoenix_motion.py')]
    files += [HERE / 'reference-repair-v31-preview.html', HERE / 'reference-repair-v31-checks.js']
    files += [HERE / f'reference-repair-v{version}-preview.html', HERE / f'reference-repair-v{version}-checks.js']
    if version >= 55:
        # v55 builds on the saved v54 acceptance instead of duplicating it.
        # Include that import and this stage's automation/packaging records.
        files += [HERE / 'reference-repair-v54-checks.js', HERE / 'finish_native_export.py',
                  HERE / 'review_final_art.cjs', HERE / 'review_source_layers.cjs',
                  HERE / 'publish_v55_desktop.py', HERE / 'save_release_recovery.py',
                  HERE / 'AUTOMATION-STATUS-20261007.md', ROOT / f'DELIVERY-{info["appVersion"]}.md',
                  HERE / f'build/native-export-pipeline-v{version}-{date}.json']
    if version >= 56:
        files += [HERE / 'package_cuff_backfill.py', HERE / 'audit_cuff_backfill.py',
                  HERE / 'review_neck_seam.cjs', HERE / 'publish_v56_desktop.py',
                  HERE / 'record_desktop_062_verification.py',
                  ROOT / 'PROGRESS-CHECKPOINT-20261008.md',
                  HERE / 'build/cuff-backfill-packaging-20261008.json',
                  HERE / 'build/cuff-backfill-v56-visual-audit-20261008.json']
    if info.get('nativeWorkingVersion', version) >= 57:
        files += [HERE / p for p in ('reference-repair-v57-preview.html', 'reference-repair-v57-checks.js',
                  'package_left_tail_completion.py', 'package_left_tail_completion_v2.py',
                  'package_keyboard_facing_character.py', 'review_keyboard_tail.cjs',
                  'audit_left_tail_alpha.cjs', 'audit_saved_tail_alpha.py', 'KEYBOARD-ASSET-20261008.md',
                  'build/left-tail-completion-v2-packaging-20261008.json',
                  'build/left-tail-v57-saved-render-audit-20261008.json',
                  'build/CURRENT-OPERATIONAL-BLOCKERS-20261008.json')]
    if info.get('nativeWorkingVersion', version) >= 59:
        files += [HERE / p for p in ('reference-repair-v58-preview.html', 'reference-repair-v58-checks.js',
                  'reference-repair-v59-preview.html', 'reference-repair-v59-checks.js',
                  'prepare_v59_checks.py', 'publish_v59_desktop.py',
                  'build/left-tail-v59-alpha-audit-20261008.json',
                  'build/left-tail-v59-visual-acceptance-20261008.json')]
    if info.get('nativeWorkingVersion', version) >= 60:
        files += [HERE / p for p in ('reference-repair-v60-preview.html', 'reference-repair-v60-checks.js',
                  'prepare_v60_checks.py', 'prepare_v60_release.py', 'publish_v60_desktop.py',
                  'write_current_progress.py', 'record_desktop_063_verification.py', 'record_desktop_064_verification.py')]
    files += [HERE / 'inspect_gaze_cutouts.cjs']
    files += [HERE / 'prepare_v072.py', HERE / 'verify_desktop_interactions.cjs', HERE / 'write_v072_delivery.py',
              ROOT / f'DELIVERY-{info["appVersion"]}.md']
    files += [HERE / 'prepare_v073.py', HERE / 'inspect_v073_art.cjs', HERE / 'verify_elastic_v073.cjs', HERE / 'write_v073_delivery.py']
    files += [HERE / 'verify_app_animation_clock.cjs', browser_input_report, app_clock_report]
    files += [HERE / 'record_desktop_069_verification.py', HERE / 'write_v069_delivery.py',
              HERE / 'correct_keyboard_zones.py', HERE / 'verify_interactions.cjs', HERE / 'verify_native_bubble_bounds.cjs', HERE / 'write_v070_delivery.py', HERE / 'write_v071_delivery.py', HERE / 'verify_pointer_rig.cjs', HERE / 'inspect_mouse_region.cjs', ROOT / 'FEATURE-OPTIONS-20261011.md', interactions_report, HERE / 'build/interactions-0.7.0-20261011/bubble-bounds.json']
    files += list((HERE / 'build/app-animation-clock-20261011').glob('*.json'))
    files += [HERE / p for p in ('prepare_v71_checks.py','audit_v71_raw_geometry.py',
        'verify_candidate_blink_v71.cjs','publish_v71_desktop.py','probe_lid_alignment.cjs',
        'probe_lid_switch.cjs','probe_lid_early_close.cjs','probe_iris_first.cjs','probe_flattened_lid.cjs')]
    if info.get('nativeWorkingVersion', version) >= 61:
        files += [HERE / p for p in ('audit_native_source_export.cjs','complete_source_audit.py',
                  'prepare_v62_checks.py','prepare_v63_checks.py','prepare_v64_checks.py',
                  'audit_v65_source.py','audit_v65_source.cjs','complete_v65_source_audit.py',
                  'publish_v64_blink.py','publish_v68_blink.py','prepare_v66_checks.py',
                  'prepare_v67_checks.py','prepare_v68_checks.py','audit_v67_raw_geometry.py','audit_v68_raw_geometry.py',
                  'write_v68_progress.py','inspect_blink_layers.py','inspect_blink_layers.cjs',
                  'prepare_v69_native_plan.py','NEXT-NATIVE-BLINK-V69.md',
                  'prepare_v69_checks.py','audit_v69_raw_geometry.py','record_native_resume.py','verify_candidate_blink.cjs',
                  'prepare_v70_checks.py','audit_v70_raw_geometry.py','verify_candidate_blink_v70.cjs',
                  'record_v70_progress.py','probe_single_contour.cjs','NEXT-NATIVE-BLINK-V70.md',
                  'verify_release_runtime.cjs','build_blink_contact_sheet.py')]
        for candidate in range(61, info.get('nativeWorkingVersion', version) + 1):
            files += [HERE / f'reference-repair-v{candidate}-preview.html',
                      HERE / f'reference-repair-v{candidate}-checks.js']
            files += list((HERE / 'build').glob(f'*v{candidate}*.json'))
        files += list((HERE / 'build/source-audit-v61-20261009').glob('*.json'))
        files += list((HERE / 'build/source-audit-v65-20261009').glob('*.json'))
        files += list((HERE / 'build').glob('blink-v68-*-20261009.json'))
        files += list((HERE / 'build').glob('v69-native-plan-20261009.json'))
    files += [HERE / p for p in ('input-blink-preview.html','verify_input_blink.cjs',
        'verify_input_blink_core.cjs','vite.input-blink.config.ts','publish_input_blink.py','write_input_blink_progress.py')]
    files += [input_report,input_status,HERE/'build/input-blink-tests-20261008.txt',
        HERE/'build/input-blink-core-run-20261008.txt',HERE/'build/desktop-0.6.5-build-20261008.log',
        HERE/'build/desktop-0.6.5-build-absolute-20261008.log']
    files += [ROOT/'PROGRESS-CHECKPOINT-20261009.md',ROOT/'PROGRESS-CHECKPOINT-20261011.md',HERE/'verify_settings_ui.cjs',
        HERE/'refactor_settings_panel.py',HERE/'write_settings_ui_progress.py',
        HERE/'record_desktop_066_verification.py',
        HERE/'build/settings-ui-tests-20261009.txt',HERE/'build/settings-ui-frontend-build-20261009.txt',
        HERE/'build/desktop-0.6.6-build-release-20261009.log']
    files += list((HERE / 'build').glob(f'desktop-{info["appVersion"]}*20261009.txt'))
    files += list((HERE / 'build').glob(f'desktop-{info["appVersion"]}*20261009.log'))
    files += list((HERE / 'build').glob('v68-adapter-input-blink-20261009.txt'))
    for directory in (HERE/'build/settings-ui-20261009',HERE/f'build/desktop-{info["appVersion"]}-ui-20261006'):
        if directory.exists():files += [p for p in directory.iterdir() if p.is_file()]
    for directory in (HERE/'build/input-blink-v70-20261011',HERE/'build/input-blink-v71-20261011',HERE/'build/single-contour-probe-20261011'):
        if directory.exists():files += list(directory.glob('*.json'))
    files += [HERE / f'build/{name}-20261005.txt' for name in ('gaze-fix-tests', 'gaze-native-tests',
        'gaze-native-all-tests', 'gaze-typecheck', 'gaze-runtime-final', 'gaze-ui')]
    files += [HERE / 'build/gaze-correction-status-20261005.json']
    files += list((HERE / 'build/gaze-cutout-v31-20261005').glob('*.json'))
    files += [HERE / 'verify_pet_menu_ui.cjs', HERE / 'run_local_qa.cjs']
    files += [ROOT / p for p in ('README.md', 'ENGINEERING_HANDOFF.md', 'TEST-REPORT.md', 'PROGRESS-CHECKPOINT-20261005.md')]
    info['implementationArchive'] = str(archive)
    info['archiveScope'] = 'Code, latest progress, runtime JSON and verification reports. Native source and official MOC3/textures are preserved alongside this code archive.'
    section = (f'## {now:%Y-%m-%d %H:%M:%S} Live2D 桌宠续接存档\n\n{args.note}\n\n'
        f'实际桌宠模型入口：{entry}。'
        f'已验证原生工程：{saved_source.relative_to(ROOT).as_posix()}；SHA256 {sha(source)}。\n\n'
        f'当前工作源与已验证源一致：{info["workingSourceMatchesVerified"]}；工作源 SHA256 {sha(working)}。'
        '继续原生编辑请打开已验证备份并另存新版本，不覆盖旧恢复点。\n\n'
        f'代码恢复包：{archive.relative_to(ROOT).as_posix()}。下一步：{args.next}。'
        '未完成项以本条下一步和对应验收记录为准；浏览器通过不代表 Windows 验收。\n\n')
    daily = ROOT / f'PROGRESS-CHECKPOINT-{date}.md'
    daily.write_text(section + (daily.read_text(encoding='utf-8-sig') if daily.exists() else ''), encoding='utf-8')
    progress = HERE / 'HAIR-TAIL-PROGRESS.md'
    progress.write_text(section + progress.read_text(encoding='utf-8-sig'), encoding='utf-8')
    # Append this stage's progress before archiving, so a restored archive does
    # not silently describe the previous stage. Keep official binaries in their
    # already hash-verified native snapshots rather than duplicating large art.
    files += [daily, progress, core_report, native_recovery_file, ui_report, native_ui_status, report]
    files += [HERE / 'prepare_eye_deform_runtime.py',
        HERE / f'build/reference-repair-v{version}-provenance-{date}.json',
        HERE / f'build/ui-{info["appVersion"]}-tests-{date}.txt',
        HERE / f'build/desktop-{info["appVersion"]}-ui-{date}/windows-build.txt']
    files += list((ROOT / f'public/models/changli/live-reference-repair-v{version}-candidate').glob('*.json'))
    for folder in (HERE / f'build/desktop-v{version}-integration-{date}', HERE / f'build/desktop-{info["appVersion"]}-ui-{date}'):
        files += list(folder.glob('*.json'))
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED) as z:
        seen = set()
        for file in files:
            if file.is_file():
                relative = file.relative_to(ROOT).as_posix()
                if relative not in seen:
                    z.write(file, relative)
                    seen.add(relative)
        z.writestr('RECOVERY-MANIFEST.json', json.dumps(info, indent=2, ensure_ascii=False) + '\n')
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise ValueError('Code archive integrity check failed')
        if json.loads(z.read('RECOVERY-MANIFEST.json')) != info or args.note not in z.read(f'PROGRESS-CHECKPOINT-{date}.md').decode('utf-8'):
            raise ValueError('Code archive does not contain this stage\'s recovery information')
    manifest = evidence / 'LATEST-RECOVERY.json'
    temporary = manifest.with_suffix('.tmp')
    temporary.write_text(json.dumps(info, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temporary.replace(manifest)
    print(json.dumps(info, ensure_ascii=True))

if __name__ == '__main__':
    main()
