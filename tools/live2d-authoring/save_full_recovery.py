"""Preserve a verified checkpoint, saved native work and runtime assets together."""
import argparse
import hashlib
import json
import re
import zipfile
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest().upper()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', required=True)
    parser.add_argument('--delivery')
    args = parser.parse_args()
    folder = HERE / f'build/desktop-integration-{args.date}'
    pointer = folder / 'LATEST-RECOVERY.json'
    info = json.loads(pointer.read_text(encoding='utf-8'))
    native = info['nativeWorkingRecovery']
    snapshot = HERE / native['latestWorkingSnapshot']
    working_version = int(re.search(r'-v(\d+)-', snapshot.name)[1])
    working = HERE / f'ChangliReferenceRepair-v{working_version}-candidate.cmo3'
    for file in (working, snapshot):
        if sha(file) != native['workingSha256']:
            raise ValueError('Native saved work changed: ' + str(file))
    baseline = Path(info['verifiedNativeSource'])
    if sha(baseline) != info['verifiedNativeSha256']:
        raise ValueError('Verified source changed')
    code = Path(info['implementationArchive'])
    with zipfile.ZipFile(code) as z:
        if z.testzip() or json.loads(z.read('RECOVERY-MANIFEST.json')) != info:
            raise ValueError('Code checkpoint failed verification')
    version = int(re.search(r'live-reference-repair-v(\d+)-', info['modelEntry'])[1])
    provenance = HERE / f'build/reference-repair-v{version}-provenance-{args.date}.json'
    resources = json.loads(provenance.read_text(encoding='utf-8'))['resources']
    runtime = ROOT / f'public/models/changli/live-reference-repair-v{version}-candidate'
    for row in resources:
        if sha(runtime / row['path']) != row['sha256']:
            raise ValueError('Runtime differs from official export')
    files = [working, snapshot, baseline, code, pointer, provenance,
             HERE / f'build/LATEST-RECOVERY-{args.date}.json',
             ROOT / f'PROGRESS-CHECKPOINT-{args.date}.md', HERE / 'HAIR-TAIL-PROGRESS.md',
             HERE / 'references/changli-original-current.png', Path(__file__)]
    files += [p for p in HERE.iterdir() if p.is_file() and p.suffix in ('.py', '.js', '.cjs', '.html', '.md')]
    files += [HERE / 'ChangliReferenceRepairSources-clean-alpha-v1.psd',
              HERE / 'build/clean-reference-packaging.json', HERE/'ChangliOriginalPhoenix-v1.psd',
              HERE/'ChangliEyeComponents-rim-v2.psd', HERE/'build/ChangliOriginalPhoenix-v1-packaging.json']
    files += [p for p in (HERE/'ChangliEyeComponents-rim-v3.psd', HERE/'ChangliOriginalShoulderJoins-v1.psd',
              HERE/'build/ChangliOriginalShoulderJoins-v1-packaging.json',
              HERE/'build/ChangliReferenceRepair-v47-autorecovered-20261007-0021.cmo3') if p.exists()]
    directories = [runtime, ROOT / 'vendor/live2d', ROOT / 'public/vendor/live2d',
                   HERE / f'build/gaze-cutout-v{version}-{args.date}',
                   HERE / f'build/desktop-v{version}-integration-{args.date}',
                   HERE / f'build/desktop-{info["appVersion"]}-ui-{args.date}', HERE / 'assets']
    directories += [HERE / f'build/contour-audit-v{version}-{args.date}',
                    HERE / f'build/editor-export-reference-repair-v{version}-{args.date}',
                    HERE / f'build/pet-menu-ui-{args.date}',
                    HERE / f'references/tool-research-{args.date}']
    if version >= 39:
        directories.append(HERE / f'build/contour-audit-v38-{args.date}')
        files += [HERE / f'build/live2d-cli-v39-validation-{args.date}.json']
    if version >= 40:
        cli_report = HERE / f'build/live2d-cli-v{version}-validation-{args.date}.json'
        if cli_report.exists():
            files.append(cli_report)
        directories.append(HERE / f'build/contour-audit-v39-{args.date}')
    files += [HERE / f'build/live2d-cli-{name}-{args.date}.{suffix}'
              for name,suffix in [('install','txt'),('validation','json'),('inspect','json')]]
    for base_version in (30, 31, 32, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52):
        directories.append(ROOT / f'public/models/changli/live-reference-repair-v{base_version}-candidate')
    for base_version in (35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52):
        for kind in ('core-verification','provenance'):
            candidate=HERE/f'build/reference-repair-v{base_version}-{kind}-{args.date}.json'
            if candidate.exists():files.append(candidate)
        if base_version in (36,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52):
            candidate=HERE/f'build/ChangliReferenceRepair-v{base_version}-{args.date}.cmo3'
            if candidate.exists():files.append(candidate)
        if base_version >= 40:
            directories += [HERE/f'build/editor-export-reference-repair-v{base_version}-{args.date}',
                            HERE/f'build/contour-audit-v{base_version}-{args.date}']
    for cuff_version in (41,42,43,44):
        directories.append(HERE/f'build/cuff-attachment-v{cuff_version}-{args.date}')
    files += [p for p in HERE.joinpath('build').glob('v42-*') if p.is_file() and p.suffix in ('.png','.json')]
    files += [p for p in HERE.joinpath('build').glob('*20261006*') if p.is_file() and
              (p.name.startswith('v39-observed-source-comparison') or p.name.startswith('ChangliReferenceRepair-v39-observed') or
               p.name.startswith(('gold-edge-pixel-review', 'v40-first-export-observation', 'reference-repair-v40-first-export-observation')))]
    if args.delivery:
        delivery = (ROOT / args.delivery).resolve()
        if ROOT.resolve() not in delivery.parents:
            raise ValueError('Delivery must be in this workspace')
        for row in json.loads((delivery / 'SHA256.json').read_text(encoding='utf-8-sig')):
            if sha(delivery / row['file']) != row['sha256']:
                raise ValueError('Delivery changed')
        directories.append(delivery)
    for directory in directories:
        if directory.exists():
            files += [p for p in directory.rglob('*') if p.is_file()]
    now = datetime.now().astimezone()
    archive = folder / f'full-recovery-{now:%Y%m%d-%H%M%S}.zip'
    manifest = {'savedAt': now.isoformat(), 'formalArtComplete': False,
                'publishedModelVersion': version, 'nativeWorkingVersion': working_version,
                'appVersion': info['appVersion'], 'files': []}
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED, compresslevel=3) as z:
        for file in sorted(set(files)):
            relative = file.relative_to(ROOT).as_posix()
            manifest['files'].append({'path': relative, 'bytes': file.stat().st_size, 'sha256': sha(file)})
            z.write(file, relative)
        z.writestr('FULL-RECOVERY-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
        z.writestr('恢复说明.txt',
            '路径相对于 outputs/changli。先解压完整恢复包，再将其中 implementation-checkpoint 解压到同一根目录。\n'
            f'Cubism 打开 tools/live2d-authoring/ChangliReferenceRepair-v{working_version}-candidate.cmo3。\n'
            '已验证源、官方导出对应资源及代码均按 SHA256 检查；正式美术尚未完工。\n'
            '运行与 Windows 验证范围以进度记录为准，不能将浏览器结果当作完整桌面验收。\n')
    with zipfile.ZipFile(archive) as z:
        if z.testzip() or json.loads(z.read('FULL-RECOVERY-MANIFEST.json')) != manifest:
            raise ValueError('Full recovery integrity failed')
    latest = {'archive': str(archive), 'bytes': archive.stat().st_size, 'sha256': sha(archive),
              'entries': len(manifest['files']), 'crcVerified': True, 'formalArtComplete': False}
    (folder / 'FULL-RECOVERY.json').write_text(json.dumps(latest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(latest, ensure_ascii=True))

if __name__ == '__main__':
    main()
