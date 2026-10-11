"""Stage an official eye-deformation export without changing the default pet."""
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'build/editor-export-eye-deform-v1-20261001'
PREVIOUS = HERE.parents[1] / 'public/models/changli/live-left-ornament-v1-candidate'
TARGET = HERE.parents[1] / 'public/models/changli/live-eye-deform-v1-candidate'
NAME = 'ChangliEyeDeformV1'

def main():
    if (SOURCE / f'{NAME}.moc3').read_bytes()[:4] != b'MOC3':
        raise ValueError('Official Editor MOC3 export required')
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)
    manual = json.loads((SOURCE / f'{NAME}.model3.json').read_text(encoding='utf-8-sig'))
    previous = json.loads((PREVIOUS / 'ChangliLeftOrnamentV1-physics.model3.json').read_text(encoding='utf-8'))
    manual['Layout'] = previous['Layout']
    (TARGET / f'{NAME}.model3.json').write_text(json.dumps(manual, indent=2) + '\n', encoding='utf-8')
    refs = previous['FileReferences']
    resources = {refs['Physics']}
    resources.update(row['File'] for row in refs['Expressions'])
    resources.update(row['File'] for rows in refs['Motions'].values() for row in rows)
    for filename in resources:
        shutil.copy2(PREVIOUS / filename, TARGET / filename)
    manual['FileReferences'].update({key: refs[key] for key in ('Physics', 'Expressions', 'Motions')})
    (TARGET / f'{NAME}-physics.model3.json').write_text(json.dumps(manual, indent=2) + '\n', encoding='utf-8')
    print(TARGET)

if __name__ == '__main__':
    main()
