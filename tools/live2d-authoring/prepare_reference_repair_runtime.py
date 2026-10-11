"""Stage only official Editor resources for original-reference contour review."""
import hashlib
import json
import shutil
import argparse

import prepare_eye_deform_runtime as staging

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', type=int, choices=tuple(range(2, 72)), default=2)
    parser.add_argument('--date', default=None)
    args = parser.parse_args()
    version = args.version
    date = args.date or ('20261006' if version >= 32 else '20261005' if version >= 29 else ('20261004' if version >= 16 else ('20261003' if version >= 12 else '20261002')))
    staging.SOURCE = staging.HERE / f'build/editor-export-reference-repair-v{version}-{date}'
    staging.TARGET = staging.HERE.parents[1] / f'public/models/changli/live-reference-repair-v{version}-candidate'
    staging.NAME = f'ChangliReferenceRepairV{version}'
    source = staging.HERE / f'ChangliReferenceRepair-v{version}-candidate.cmo3'
    backup = staging.HERE / f'build/ChangliReferenceRepair-v{version}-{date}.cmo3'
    if backup.exists() and source.read_bytes() != backup.read_bytes():
        raise ValueError(f'Existing recovery backup differs; preserve both before staging: {backup}')
    if not backup.exists():
        shutil.copy2(source, backup)
    staging.main()
    if version >= 27:
        # This version has native Editor-authored physics. Preserve its exact
        # resource and point both manifests at it instead of the old runtime rig.
        physics_name = f'{staging.NAME}.physics3.json'
        physics_source = staging.SOURCE / physics_name
        if not physics_source.exists():
            raise ValueError('Native Editor physics export required')
        shutil.copy2(physics_source, staging.TARGET / physics_name)
        for suffix in ('.model3.json', '-physics.model3.json'):
            manifest_path = staging.TARGET / f'{staging.NAME}{suffix}'
            manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
            manifest['FileReferences']['Physics'] = physics_name
            manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    resources = []
    for p in [staging.SOURCE / f'{staging.NAME}.moc3', *sorted(staging.SOURCE.glob('*.2048/*.png')),
              *([staging.SOURCE / f'{staging.NAME}.physics3.json'] if version >= 27 else [])]:
        relative = p.relative_to(staging.SOURCE)
        digest = hashlib.sha256(p.read_bytes()).hexdigest().upper()
        if p.read_bytes() != (staging.TARGET / relative).read_bytes():
            raise ValueError(f'Runtime differs from official export: {relative}')
        resources.append({'path': relative.as_posix(), 'bytes': p.stat().st_size,
                          'sha256': digest, 'runtimeIdentical': True})
    provenance = {'candidate': staging.NAME,
                  'authoringSha256': hashlib.sha256(source.read_bytes()).hexdigest().upper(),
                  'backupIdentical': source.read_bytes() == backup.read_bytes(),
                  'resources': resources, 'formalArtComplete': False,
                  'windowsDesktopVerified': False,
                  'physics': ('Native Editor ReferenceHairInertia group exported unchanged' if version >= 27
                              else 'Existing runtime physics copied; no new Editor physics authored')}
    (staging.HERE / f'build/reference-repair-v{version}-provenance-{date}.json').write_text(
        json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
    if version >= 30:
        from build_phoenix_motion import main as build_phoenix_motion
        build_phoenix_motion(version)
