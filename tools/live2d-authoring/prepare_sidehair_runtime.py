"""Stage the official side-hair export with provisional local physics."""
import json
from pathlib import Path

from prepare_secondary_physics import rig
from prepare_tail_runtime import prepare

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'build/editor-export-sidehair-20260928'
TARGET = HERE.parents[1] / 'public/models/changli/live-sidehair-draft'


def main():
    prepare(SOURCE, TARGET, 'ChangliSideHair')
    path = TARGET / 'tail.physics3.json'
    physics = json.loads(path.read_text(encoding='utf-8'))
    additions = [
        ('SideHairRight', 'ParamSideHairRightSway', 0.8, 0.28, 0.68),
        ('SideHairLeft', 'ParamSideHairLeftSway', -0.7, 0.34, 0.63),
    ]
    for number, row in enumerate(additions, start=4):
        physics['PhysicsSettings'].append(rig(number, *row))
        physics['Meta']['PhysicsDictionary'].append({
            'Id': f'PhysicsSetting{number}', 'Name': row[0],
        })
    physics['Meta'].update({
        'PhysicsSettingCount': 5,
        'TotalInputCount': 5,
        'TotalOutputCount': 5,
        'VertexCount': 10,
    })
    path.write_text(json.dumps(physics, indent=2) + '\n', encoding='utf-8')
    eyes_default = [('ParamEyeLOpen', 0, 'Add'), ('ParamEyeROpen', 0, 'Add')]
    eyes_closed = [('ParamEyeLOpen', 0, 'Multiply'),
                   ('ParamEyeROpen', 0, 'Multiply')]
    mouth_default = [('ParamMouthOpenY', 0, 'Add'),
                     ('ParamMouthForm', 0, 'Add')]
    expressions = {
        'Neutral': eyes_default + mouth_default,
        'Smile': eyes_closed + [('ParamMouthOpenY', 0, 'Add'),
                                 ('ParamMouthForm', 0.55, 'Add')],
        'Sleepy': eyes_closed + [('ParamMouthOpenY', 0.15, 'Add'),
                                  ('ParamMouthForm', 0, 'Add')],
        'Surprised': [('ParamEyeLOpen', 1, 'Overwrite'),
                      ('ParamEyeROpen', 1, 'Overwrite'),
                      ('ParamMouthOpenY', 0.65, 'Add'),
                      ('ParamMouthForm', 0, 'Add')],
    }
    for name, params in expressions.items():
        expression = {
            'Type': 'Live2D Expression', 'FadeInTime': 0.25,
            'FadeOutTime': 0.3,
            'Parameters': [
                {'Id': param, 'Value': value, 'Blend': blend}
                for param, value, blend in params
            ],
        }
        (TARGET / f'{name.lower()}.exp3.json').write_text(
            json.dumps(expression, indent=2) + '\n', encoding='utf-8',
        )
    manifest_path = TARGET / 'ChangliSideHair.model3.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest['FileReferences']['Expressions'] = [
        {'Name': name, 'File': f'{name.lower()}.exp3.json'} for name in expressions
    ]
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'Staged {TARGET} with independent side-hair physics and 4 technical expressions.')


if __name__ == '__main__':
    main()
