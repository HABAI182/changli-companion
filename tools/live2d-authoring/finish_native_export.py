"""One command for an already saved, officially exported Cubism candidate.

Wait for export files to settle, stage exact official bytes, use the installed
Live2D skill's CLI, run Core/physics and visual QA, then save a verified native
checkpoint. This never operates the Editor or approves final artwork.
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--version', required=True, type=int)
    p.add_argument('--date', default='20261006')
    args = p.parse_args()
    version, date = args.version, args.date
    export = HERE / f'build/editor-export-reference-repair-v{version}-{date}'
    name = f'ChangliReferenceRepairV{version}'
    model = export / f'{name}.model3.json'
    report_file = HERE / f'build/native-export-pipeline-v{version}-{date}.json'
    report = {'version': version, 'formalArtComplete': False, 'steps': []}
    env = dict(os.environ, PYTHONIOENCODING='utf-8')

    def record():
        temp = report_file.with_suffix('.tmp')
        temp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temp.replace(report_file)

    def run(label, command, output=None):
        result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if output:
            output.write_text(result.stdout + result.stderr, encoding='utf-8')
        report['steps'].append({'name': label, 'exitCode': result.returncode, 'log': str(output) if output else None})
        record()
        print(f'{label}: exit {result.returncode}', flush=True)
        if result.returncode:
            raise RuntimeError(f'{label} failed: {result.stderr[-1500:]}')
        return result.stdout

    # MOC3 can appear before the last atlas finishes. Check the manifest's exact
    # resources twice, and reject a missing/incomplete export instead of staging.
    previous = None
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            refs = json.loads(model.read_text(encoding='utf-8-sig'))['FileReferences']
            files = [model, export / refs['Moc'], export / refs['Physics'], *[export / f for f in refs['Textures']]]
            signature = [(str(f), f.stat().st_size, f.stat().st_mtime_ns) for f in files]
            if all(row[1] > 0 for row in signature) and signature == previous:
                break
            previous = signature
        except (OSError, KeyError, ValueError):
            previous = None
        time.sleep(.5)
    else:
        raise RuntimeError('Official export did not finish within 60 seconds')

    run('stage-official-export', [sys.executable, str(HERE / 'prepare_reference_repair_runtime.py'), '--version', str(version), '--date', date])
    runtime = ROOT / f'public/models/changli/live-reference-repair-v{version}-candidate/{name}-physics.model3.json'
    cli = HERE / 'build/live2d-cli-venv/Scripts/cli-anything-live2d.exe'
    report['cli'] = {}
    for command in ('inspect', 'validate', 'lint'):
        result = run(f'live2d-skill-{command}', [str(cli), '--json', command, str(runtime)])
        data = json.loads(result)
        report['cli'][command] = data
        if command == 'validate' and not data['ok']:
            raise RuntimeError('Live2D dependency validation rejected the export')
        if command == 'lint' and data['errors']:
            raise RuntimeError('Live2D lint found errors')
        record()
    qa = str(HERE / 'run_local_qa.cjs')
    if version in (69,70,71):
        run('read-only-raw-geometry', [sys.executable, str(HERE / f'audit_v{version}_raw_geometry.py')], HERE / f'build/v{version}-raw-geometry-run-20261011.txt')
    run('official-Core-and-physics', ['node', qa, str(HERE / 'verify_reference_repair.cjs'), f'--v{version}'], HERE / f'build/v{version}-core-run-{date}.txt')
    run('render-art-review', ['node', qa, str(HERE / 'review_final_art.cjs'), str(version)], HERE / f'build/v{version}-art-review-run-{date}.txt')
    if version >= 58:
        run('tail-neutral-alpha', ['node', qa, str(HERE / 'audit_left_tail_alpha.cjs'), str(version)], HERE / f'build/v{version}-tail-alpha-run-{date}.txt')
        run('tail-keyboard-pose-review', ['node', qa, str(HERE / 'review_keyboard_tail.cjs'), str(version)], HERE / f'build/v{version}-tail-review-run-{date}.txt')
    run('save-verified-native', [sys.executable, str(HERE / 'save_reference_repair_checkpoint.py'), '--version', str(version), '--date', date, '--verified', '--note', f'Native v{version}: official export, installed Live2D CLI dependency/lint checks, Core regression and physics passed. Visual review generated; final art acceptance remains pending.', '--next', 'Inspect neutral/closed/mouth visual review, then publish the desktop model and validate its runtime chain.'])
    report['pass'] = True
    record()
    print(f'Saved pipeline report: {report_file}', flush=True)


if __name__ == '__main__':
    main()
