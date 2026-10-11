"""Record a saved native source and preserve recovery points without editing it.

Run after saving in Cubism. This does not save the editor's in-memory document.
Passing --verified requires the actual verifier report and matching provenance.
"""
import argparse
import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def preserve(source, target):
    if target.exists():
        if digest(source) != digest(target):
            raise ValueError(f'Recovery point differs; never overwrite: {target}')
    else:
        shutil.copy2(source, target)
    if digest(source) != digest(target):
        raise ValueError(f'Backup verification failed: {target}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True, type=int)
    parser.add_argument('--date', default=datetime.now().strftime('%Y%m%d'))
    parser.add_argument('--verified', action='store_true')
    parser.add_argument('--note', required=True)
    parser.add_argument('--next', required=True)
    args = parser.parse_args()
    source = HERE / f'ChangliReferenceRepair-v{args.version}-candidate.cmo3'
    source_hash = digest(source)
    now = datetime.now().astimezone()
    # Always preserve a distinct working snapshot before examining old checkpoints.
    snapshot = HERE / f'build/ChangliReferenceRepair-v{args.version}-saved-{now:%Y%m%d-%H%M%S}.cmo3'
    preserve(source, snapshot)
    manifest_path = HERE / f'build/LATEST-RECOVERY-{args.date}.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig')) if manifest_path.exists() else {}
    state = 'saved; verification pending'
    evidence = ''
    if args.verified:
        report_path = HERE / f'build/reference-repair-v{args.version}-core-verification-{args.date}.json'
        provenance_path = HERE / f'build/reference-repair-v{args.version}-provenance-{args.date}.json'
        report = json.loads(report_path.read_text(encoding='utf-8-sig'))
        provenance = json.loads(provenance_path.read_text(encoding='utf-8-sig'))
        if not report.get('pass') or report.get('version') != args.version:
            raise ValueError('Actual verifier did not pass this version')
        if args.version >= 27 and not (report.get('nativePhysics', {}).get('pass') and report.get('physicsContinuous', {}).get('pass')):
            raise ValueError('Native physics verification did not pass this version')
        if provenance.get('authoringSha256') != source_hash or not provenance.get('backupIdentical'):
            raise ValueError('Saved source does not match the verified provenance')
        official = HERE / f'build/editor-export-reference-repair-v{args.version}-{args.date}'
        runtime = ROOT / f'public/models/changli/live-reference-repair-v{args.version}-candidate'
        for resource in provenance['resources']:
            for base in (official, runtime):
                file = base / resource['path']
                if file.stat().st_size != resource['bytes'] or digest(file) != resource['sha256']:
                    raise ValueError(f'Export/runtime provenance mismatch: {file}')
        backup = HERE / f'build/ChangliReferenceRepair-v{args.version}-{args.date}.cmo3'
        preserve(source, backup)
        manifest.update(latestPassedSource=backup.relative_to(HERE).as_posix(),
                        passedSha256=source_hash, officialExport=provenance['resources'][0],
                        verifiedReport=report_path.relative_to(HERE).as_posix())
        state = 'saved / official export / Core PASS'
        continuous = report['continuous']
        evidence = (f"Actual report: {report_path.name}; {report['drawables']} meshes / "
                    f"{report['parameters']} parameters; {continuous['frames']} frames / "
                    f"{continuous['durationMs']:.1f} ms; flips={continuous['flips']}, "
                    f"degenerate={continuous['degenerate']}, nonFinite={continuous['nonFinite']}; "
                    f"physicsEnabled={continuous['physicsEnabled']}.\n\n")
        if args.version >= 27:
            physics = report['nativePhysics']
            live = report['physicsContinuous']
            evidence += (f"Native Editor physics PASS: {physics['simulatedFrames']} simulated frames; "
                         f"settleMax={physics['settleMax']:.8f}; {live['frames']} real frames / "
                         f"{live['durationMs']:.1f} ms with physics enabled.\n\n")
    manifest.update(savedAt=now.isoformat(), latestWorkingSnapshot=snapshot.relative_to(HERE).as_posix(),
                    workingSha256=source_hash, workingState=state, next=args.next,
                    formalArtComplete=False, windowsDesktopVerified=False,
                    sourceMatchesOfficialExport=bool(args.verified))
    # Atomic manifest publication; complete source backup already exists.
    temporary = manifest_path.with_suffix('.tmp')
    temporary.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temporary.replace(manifest_path)
    section = (f'## {now:%Y-%m-%d %H:%M:%S} v{args.version} 自动恢复记录：{state}\n\n'
               f'{args.note}\n\nSource: {source.name}, {source.stat().st_size:,} bytes; '
               f'SHA256 {source_hash}. Byte-identical snapshot: {snapshot.relative_to(HERE).as_posix()}.\n\n'
               f'{evidence}下一步：{args.next}。正式美术未完工；本记录不代表Windows桌面验收。\n\n')
    for path in (ROOT / f'PROGRESS-CHECKPOINT-{args.date}.md', HERE / 'HAIR-TAIL-PROGRESS.md'):
        path.write_text(section + (path.read_text(encoding='utf-8-sig') if path.exists() else ''), encoding='utf-8')
    print(json.dumps({'saved': str(snapshot), 'sha256': source_hash, 'state': state}, ensure_ascii=True))


if __name__ == '__main__':
    main()
