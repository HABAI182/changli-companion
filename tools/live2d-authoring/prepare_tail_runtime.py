"""Publish the actual native tail export to an isolated development preview."""
import json
import shutil
from pathlib import Path
from prepare_editor_runtime import motion
from prepare_secondary_physics import rig

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'build/editor-export-tail-v2-20260927'
TARGET = HERE.parents[1] / 'public/models/changli/live-tail-draft'

def prepare(source=SOURCE, target=TARGET, model_name='ChangliTail'):
    assert (source / f'{model_name}.moc3').read_bytes()[:4] == b'MOC3'
    shutil.copytree(source, target, dirs_exist_ok=True)
    rows = [('Ahoge', 'ParamHairFront', 1.4, .15, .7),
            ('OrnamentRight', 'ParamHairSide', 1.2, .24, .75),
            ('PhoenixTail', 'ParamPhoenixTailSway', 24, .35, .65)]
    physics = {'Version': 3, 'Meta': {
        'PhysicsSettingCount': 3, 'TotalInputCount': 3, 'TotalOutputCount': 3,
        'VertexCount': 6, 'Fps': 60,
        'EffectiveForces': {'Gravity': {'X': 0, 'Y': -1}, 'Wind': {'X': 0, 'Y': 0}},
        'PhysicsDictionary': [{'Id': f'PhysicsSetting{i+1}', 'Name': row[0]}
                              for i, row in enumerate(rows)],
    }, 'PhysicsSettings': [rig(i+1, *row) for i, row in enumerate(rows)]}
    (target / 'tail.physics3.json').write_text(json.dumps(physics, indent=2)+'\n', encoding='utf-8')
    path = target / f'{model_name}.model3.json'
    manifest = json.loads(path.read_text(encoding='utf-8-sig'))
    manifest['FileReferences']['Physics'] = 'tail.physics3.json'
    motions = {}
    for name, param in [('LeftPress', 'ParamHandLeftPress'),
                        ('RightPress', 'ParamHandRightPress')]:
        filename = name.lower()+'.motion3.json'
        data = motion({param: [(0, 0), (.12, 30), (.23, 0), (.4, 0)]}, .4)
        (target / filename).write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')
        motions[name] = [{'File': filename}]
    filename = 'secondary-impulse.motion3.json'
    data = motion({'ParamAngleX': [(0, 0), (.15, 30), (.45, -30), (.8, 0), (1.2, 0)]}, 1.2)
    (target / filename).write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')
    motions['SecondaryImpulse'] = [{'File': filename}]
    manifest['FileReferences']['Motions'] = motions
    path.write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(f'Prepared native export {model_name} at {target}.')

if __name__ == '__main__': prepare()
