"""Stage the official PhoenixWingV2 export for isolated Cubism Core QA.

This copies the Editor-generated MOC3 and textures without changing them or
the app's default model. Physics and expressions remain provisional SDK JSON.
"""

import json
import shutil
from pathlib import Path

from prepare_secondary_physics import rig

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'build/editor-export-phoenix-wing-v2-20260929'
BASE = HERE.parents[1] / 'public/models/changli/live-sidehair-draft'
TARGET = HERE.parents[1] / 'public/models/changli/live-phoenix-wing-v2-candidate'
NAME = 'ChangliPhoenixWingV2'


def main():
    moc = SOURCE / f'{NAME}.moc3'
    if moc.read_bytes()[:4] != b'MOC3':
        raise ValueError('A genuine Cubism Editor MOC3 export is required')
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)

    base_manifest = json.loads((BASE / 'ChangliSideHair.model3.json').read_text(encoding='utf-8'))
    references = base_manifest['FileReferences']
    resource_names = {references['Physics']}
    resource_names.update(item['File'] for item in references['Expressions'])
    resource_names.update(item['File'] for items in references['Motions'].values() for item in items)
    for filename in resource_names:
        shutil.copy2(BASE / filename, TARGET / filename)

    physics_path = TARGET / references['Physics']
    physics = json.loads(physics_path.read_text(encoding='utf-8'))
    if physics['Meta']['PhysicsSettingCount'] != 5:
        raise ValueError('Expected five existing side-hair physics settings')
    physics['PhysicsSettings'].append(rig(6, 'PhoenixWing', 'ParamPhoenixWingSway', 24, .31, .62))
    physics['Meta']['PhysicsDictionary'].append({'Id': 'PhysicsSetting6', 'Name': 'PhoenixWing'})
    physics['Meta']['PhysicsSettingCount'] = 6
    physics['Meta']['TotalInputCount'] = 6
    physics['Meta']['TotalOutputCount'] = 6
    physics['Meta']['VertexCount'] = 12
    physics_path.write_text(json.dumps(physics, indent=2) + '\n', encoding='utf-8')

    path = TARGET / f'{NAME}.model3.json'
    manifest = json.loads(path.read_text(encoding='utf-8-sig'))
    manifest['FileReferences']['Physics'] = references['Physics']
    manifest['FileReferences']['Expressions'] = references['Expressions']
    manifest['FileReferences']['Motions'] = references['Motions']
    path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    # Isolated endpoint inspection must not let the physics output overwrite
    # the wing parameter on the next rendered frame.
    manual = json.loads(json.dumps(manifest))
    manual['FileReferences'].pop('Physics', None)
    (TARGET / f'{NAME}-manual.model3.json').write_text(
        json.dumps(manual, indent=2) + '\n', encoding='utf-8')
    print(f'Staged official MOC3 and provisional SDK JSON at {TARGET}')


if __name__ == '__main__':
    main()
