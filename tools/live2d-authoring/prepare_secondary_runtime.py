"""Copy an actual Editor export and attach provisional SDK physics and motions."""
import json
import shutil
from pathlib import Path
from prepare_editor_runtime import motion
from prepare_secondary_physics import main as prepare_physics

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE = HERE / 'build/editor-export-secondary-20260927'
TARGET = ROOT / 'public/models/changli/live-secondary-draft'

def main():
    assert (SOURCE / 'ChangliSecondary.moc3').read_bytes()[:4] == b'MOC3'
    prepare_physics()
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)
    manifest_path = TARGET / 'ChangliSecondary.model3.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    shutil.copy2(HERE / 'build/secondary.physics3.json', TARGET / 'secondary.physics3.json')
    manifest['FileReferences']['Physics'] = 'secondary.physics3.json'
    motions = {}
    for name, param in [('LeftPress', 'ParamHandLeftPress'), ('RightPress', 'ParamHandRightPress')]:
        filename = name.lower() + '.motion3.json'
        data = motion({param: [(0, 0), (.12, 30), (.23, 0), (.4, 0)]}, .4)
        (TARGET / filename).write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')
        motions[name] = [{'File': filename}]
    # AngleX is an input channel for secondary physics, not a completed head turn.
    filename = 'secondary-impulse.motion3.json'
    data = motion({'ParamAngleX': [(0, 0), (.15, 30), (.45, -30), (.8, 0), (1.2, 0)]}, 1.2)
    (TARGET / filename).write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')
    motions['SecondaryImpulse'] = [{'File': filename}]
    manifest['FileReferences']['Motions'] = motions
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print('Published isolated official export with provisional secondary physics.')

if __name__ == '__main__':
    main()
