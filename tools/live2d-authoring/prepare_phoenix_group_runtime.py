"""Stage the genuine Editor group export; preserve the default model."""
import shutil
import json
from pathlib import Path
from prepare_secondary_physics import rig

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'build/editor-export-phoenix-group-v1-fixed-20261001'
TARGET = HERE.parents[1] / 'public/models/changli/live-phoenix-group-v1-candidate'
NAME = 'ChangliPhoenixGroupV1'
WING = HERE.parents[1] / 'public/models/changli/live-phoenix-wing-v2-candidate'

def main():
    if (SOURCE / f'{NAME}.moc3').read_bytes()[:4] != b'MOC3':
        raise ValueError('Official Editor MOC3 export required')
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)
    # Keep the official manifest untouched for isolated endpoint QA. The
    # companion manifest attaches provisional SDK physics, not Editor physics.
    manifest = json.loads((SOURCE / f'{NAME}.model3.json').read_text(encoding='utf-8-sig'))
    wing_manifest = json.loads((WING / 'ChangliPhoenixWingV2.model3.json').read_text(encoding='utf-8'))
    refs = wing_manifest['FileReferences']
    resources = {refs['Physics']}
    resources.update(row['File'] for row in refs['Expressions'])
    resources.update(row['File'] for rows in refs['Motions'].values() for row in rows)
    for filename in resources:
        shutil.copy2(WING / filename, TARGET / filename)
    physics_path = TARGET / refs['Physics']
    physics = json.loads(physics_path.read_text(encoding='utf-8'))
    if len(physics['PhysicsSettings']) != 6:
        raise ValueError('Expected six existing wing physics settings')
    if any(row['Output'][0]['Destination']['Id'] == 'ParamPhoenixSway' for row in physics['PhysicsSettings']):
        raise ValueError('Duplicate whole-phoenix physics output')
    physics['PhysicsSettings'].append(rig(7, 'PhoenixFloat', 'ParamPhoenixSway', 20, .4, .65))
    physics['Meta']['PhysicsDictionary'].append({'Id': 'PhysicsSetting7', 'Name': 'PhoenixFloat'})
    physics['Meta'].update(PhysicsSettingCount=7, TotalInputCount=7, TotalOutputCount=7, VertexCount=14)
    physics_path.write_text(json.dumps(physics, indent=2) + '\n', encoding='utf-8')
    manifest['FileReferences'].update({key: refs[key] for key in ('Physics', 'Expressions', 'Motions')})
    (TARGET / f'{NAME}-physics.model3.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(TARGET)

if __name__ == '__main__':
    main()
