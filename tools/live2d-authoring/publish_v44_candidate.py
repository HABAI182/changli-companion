"""Publish the native cuff refinement only after actual Core acceptance."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

if __name__ == '__main__':
    report = json.loads((HERE / 'build/reference-repair-v44-core-verification-20261006.json').read_text())
    if not report['pass'] or not all(report[k]['pass'] for k in ('nativeCuffAttachment', 'regressions', 'continuous', 'nativePhysics', 'physicsContinuous')):
        raise ValueError('Native v44 cuff/Core/physics acceptance required')
    for name in ('package.json', 'package-lock.json', 'src-tauri/tauri.conf.json'):
        path = ROOT / name
        doc = json.loads(path.read_text(encoding='utf-8'))
        if doc['version'] not in ('0.5.13', '0.5.14'):
            raise ValueError('Unexpected app baseline')
        doc['version'] = '0.5.14'
        if name == 'package-lock.json':
            doc['packages']['']['version'] = '0.5.14'
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for name, before, after in (('src-tauri/Cargo.toml', 'version = "0.5.13"', 'version = "0.5.14"'), ('src/App.tsx', 'v0.5.13', 'v0.5.14')):
        path = ROOT / name
        path.write_text(path.read_text(encoding='utf-8').replace(before, after), encoding='utf-8')
    path = ROOT / 'public/models/changli/model.json'
    doc = json.loads(path.read_text(encoding='utf-8'))
    doc['version'] = '0.9.3-candidate'
    live = doc['renderer']['live2d']
    live['entry'] = 'live-reference-repair-v44-candidate/ChangliReferenceRepairV44-physics.model3.json'
    status = '保留视线、脸型、左侧底边、发束物理和金饰收边；v44原生袖口关键形精修，±5度侧倾四个下缘点偏离降至3原图像素以内，中立和其余图层保持。袖口其他细边、右饰品遮罩、凤凰正式原图美术、多角度和完整表情仍未完成。'
    doc['art_status'] = live['art_status'] = status
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    path = HERE / 'desktop-integration-preview.html'
    path.write_text(path.read_text(encoding='utf-8').replace('(31|32|35|36|37|38|39|40|41|42)', '(31|32|35|36|37|38|39|40|41|42|44)'), encoding='utf-8')
    print('Published v44 / 0.5.14; formalArtComplete remains false')
