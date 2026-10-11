"""Create a provisional official-format physics rig; bind meshes before publishing."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

def rig(number, name, output, scale, delay, mobility):
    return {
        'Id': f'PhysicsSetting{number}',
        'Input': [{'Source': {'Target': 'Parameter', 'Id': 'ParamAngleX'},
                   'Weight': 100, 'Type': 'Angle', 'Reflect': False}],
        'Output': [{'Destination': {'Target': 'Parameter', 'Id': output},
                    'VertexIndex': 1, 'Scale': scale, 'Weight': 100,
                    'Type': 'Angle', 'Reflect': False}],
        'Vertices': [
            {'Position': {'X': 0, 'Y': 0}, 'Mobility': 0, 'Delay': 0, 'Acceleration': 0, 'Radius': 0},
            {'Position': {'X': 0, 'Y': 12}, 'Mobility': mobility, 'Delay': delay, 'Acceleration': 1, 'Radius': 12},
        ],
        'Normalization': {key: {'Minimum': -30, 'Maximum': 30, 'Default': 0}
                          for key in ['Position', 'Angle']},
    }

def main():
    # Framework angle outputs are radians; scale into each authored parameter range.
    rows = [('Ahoge', 'ParamHairFront', 1.4, .15, .7),
            ('OrnamentRight', 'ParamHairSide', 1.2, .24, .75),
            ('Phoenix', 'ParamPhoenixSway', 24, .35, .65)]
    data = {'Version': 3, 'Meta': {
        'PhysicsSettingCount': 3, 'TotalInputCount': 3, 'TotalOutputCount': 3,
        'VertexCount': 6, 'Fps': 60,
        'EffectiveForces': {'Gravity': {'X': 0, 'Y': -1}, 'Wind': {'X': 0, 'Y': 0}},
        'PhysicsDictionary': [{'Id': f'PhysicsSetting{i+1}', 'Name': r[0]} for i, r in enumerate(rows)],
    }, 'PhysicsSettings': [rig(i+1, *row) for i, row in enumerate(rows)]}
    destination = HERE / 'build' / 'secondary.physics3.json'
    destination.write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')
    print(f'Staged {destination}; do not publish until mesh bindings and impulse QA pass.')

if __name__ == '__main__':
    main()
