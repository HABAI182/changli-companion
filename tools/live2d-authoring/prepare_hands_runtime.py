"""Publish actual Editor export to an isolated draft, without changing MOC3."""
import json
import shutil
from pathlib import Path
from prepare_editor_runtime import motion

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).parent / 'build' / 'editor-export-hands-20260927'
TARGET = ROOT / 'public' / 'models' / 'changli' / 'live-hands-draft'

def main():
    assert (SOURCE / 'ChangliHands.moc3').read_bytes()[:4] == b'MOC3'
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)
    manifest = json.loads((TARGET / 'ChangliHands.model3.json').read_text(encoding='utf-8-sig'))
    motions = {}
    for name, param in [('LeftPress', 'ParamHandLeftPress'), ('RightPress', 'ParamHandRightPress')]:
        filename = name.lower() + '.motion3.json'
        data = motion({param: [(0, 0), (0.12, 30), (0.23, 0), (0.4, 0)]}, 0.4)
        (TARGET / filename).write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
        motions[name] = [{'File': filename}]
    manifest['FileReferences']['Motions'] = motions
    (TARGET / 'ChangliHands.model3.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('Published official export and two provisional independent hand motions.')

if __name__ == '__main__':
    main()
