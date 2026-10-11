"""Stage the Editor export without changing the desktop default model."""
import json
import shutil
from pathlib import Path
from prepare_secondary_physics import rig

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'build/editor-export-bang-center-v2-20261001'
TARGET = HERE.parents[1] / 'public/models/changli/live-bang-center-v2-candidate'
GROUP = HERE.parents[1] / 'public/models/changli/live-phoenix-group-v1-candidate'
NAME = 'ChangliBangCenterV2'

def main():
    if (SOURCE / f'{NAME}.moc3').read_bytes()[:4] != b'MOC3':
        raise ValueError('Official Editor MOC3 export required')
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)
    manifest = json.loads((SOURCE / f'{NAME}.model3.json').read_text(encoding='utf-8-sig'))
    previous = json.loads((GROUP / 'ChangliPhoenixGroupV1-physics.model3.json').read_text(encoding='utf-8'))
    refs = previous['FileReferences']
    resources = {refs['Physics']}
    resources.update(row['File'] for row in refs['Expressions'])
    resources.update(row['File'] for rows in refs['Motions'].values() for row in rows)
    for filename in resources:
        shutil.copy2(GROUP / filename, TARGET / filename)
    physics = json.loads((TARGET / refs['Physics']).read_text(encoding='utf-8'))
    if len(physics['PhysicsSettings']) != 7:
        raise ValueError('Expected seven existing physics settings')
    physics['PhysicsSettings'].append(rig(8, 'BangCenter', 'ParamBangCenterSway', .7, .22, .72))
    physics['Meta']['PhysicsDictionary'].append({'Id': 'PhysicsSetting8', 'Name': 'BangCenter'})
    physics['Meta'].update(PhysicsSettingCount=8, TotalInputCount=8, TotalOutputCount=8, VertexCount=16)
    (TARGET / refs['Physics']).write_text(json.dumps(physics, indent=2) + '\n', encoding='utf-8')
    manifest['FileReferences'].update({key: refs[key] for key in ('Physics', 'Expressions', 'Motions')})
    (TARGET / f'{NAME}-physics.model3.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(TARGET)

if __name__ == '__main__':
    main()
