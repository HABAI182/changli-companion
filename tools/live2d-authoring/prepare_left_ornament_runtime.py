"""Stage an official Editor export and an independent ninth SDK physics rig."""
import json
import shutil
from pathlib import Path
from prepare_secondary_physics import rig

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'build/editor-export-left-ornament-v1-20261001'
TARGET = HERE.parents[1] / 'public/models/changli/live-left-ornament-v1-candidate'
PREVIOUS = HERE.parents[1] / 'public/models/changli/live-bang-center-v2-candidate'
NAME = 'ChangliLeftOrnamentV1'

def main():
    if (SOURCE / f'{NAME}.moc3').read_bytes()[:4] != b'MOC3':
        raise ValueError('Official Editor MOC3 export required')
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)
    manifest = json.loads((SOURCE / f'{NAME}.model3.json').read_text(encoding='utf-8-sig'))
    previous = json.loads((PREVIOUS / 'ChangliBangCenterV2-physics.model3.json').read_text(encoding='utf-8'))
    refs = previous['FileReferences']
    resources = {refs['Physics']}
    resources.update(row['File'] for row in refs['Expressions'])
    resources.update(row['File'] for rows in refs['Motions'].values() for row in rows)
    for filename in resources:
        shutil.copy2(PREVIOUS / filename, TARGET / filename)
    physics = json.loads((TARGET / refs['Physics']).read_text(encoding='utf-8'))
    if len(physics['PhysicsSettings']) != 8:
        raise ValueError('Expected eight existing physics settings')
    physics['PhysicsSettings'].append(rig(9, 'OrnamentLeft', 'ParamOrnamentLeftSway', .65, .26, .73))
    physics['Meta']['PhysicsDictionary'].append({'Id': 'PhysicsSetting9', 'Name': 'OrnamentLeft'})
    physics['Meta'].update(PhysicsSettingCount=9, TotalInputCount=9, TotalOutputCount=9, VertexCount=18)
    (TARGET / refs['Physics']).write_text(json.dumps(physics, indent=2) + '\n', encoding='utf-8')
    manifest['FileReferences'].update({key: refs[key] for key in ('Physics', 'Expressions', 'Motions')})
    # The current side-hair draft extends beyond the source canvas. Leave a
    # framing margin so its live deformations are not cut by the WebGL viewport.
    # Framework setupFromLayout consumes lowercase SDK keys. The exported
    # mesh coordinates already use a centred origin, so apply no centre offset.
    manifest['Layout'] = {'width': 1.7, 'x': 0, 'y': 0}
    manual = json.loads((SOURCE / f'{NAME}.model3.json').read_text(encoding='utf-8-sig'))
    manual['Layout'] = manifest['Layout']
    (TARGET / f'{NAME}.model3.json').write_text(json.dumps(manual, indent=2) + '\n', encoding='utf-8')
    # SDK parameter animation over the two existing authored hand deformations.
    # This is an input pulse, not a new fully illustrated character animation.
    left = json.loads((TARGET / 'leftpress.motion3.json').read_text(encoding='utf-8'))
    right = json.loads((TARGET / 'rightpress.motion3.json').read_text(encoding='utf-8'))
    left['Curves'].extend(right['Curves'])
    left['Meta'].update(CurveCount=2, TotalSegmentCount=6, TotalPointCount=8)
    (TARGET / 'bothpress.motion3.json').write_text(json.dumps(left, indent=2) + '\n', encoding='utf-8')
    manifest['FileReferences']['Motions']['BothPress'] = [{'File': 'bothpress.motion3.json'}]
    (TARGET / f'{NAME}-physics.model3.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(TARGET)

if __name__ == '__main__':
    main()
