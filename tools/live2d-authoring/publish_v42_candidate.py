"""Publish only the native cuff keyforms checked against the v41 model."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

if __name__ == '__main__':
    report = json.loads((HERE / 'build/reference-repair-v42-core-verification-20261006.json').read_text())
    if not report['pass'] or not all(report[k]['pass'] for k in ('nativeCuffAttachment', 'regressions', 'continuous', 'nativePhysics', 'physicsContinuous')):
        raise ValueError('Native v42 cuff/Core/physics verification required')
    for file in ('package.json', 'package-lock.json', 'src-tauri/tauri.conf.json'):
        path = ROOT / file
        doc = json.loads(path.read_text(encoding='utf-8'))
        if doc['version'] not in ('0.5.12', '0.5.13'):
            raise ValueError('Unexpected app baseline')
        doc['version'] = '0.5.13'
        if file == 'package-lock.json':
            doc['packages']['']['version'] = '0.5.13'
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for file, before, after in (('src-tauri/Cargo.toml', 'version = "0.5.12"', 'version = "0.5.13"'), ('src/App.tsx', 'v0.5.12', 'v0.5.13')):
        path = ROOT / file
        path.write_text(path.read_text(encoding='utf-8').replace(before, after), encoding='utf-8')
    path = ROOT / 'public/models/changli/model.json'
    doc = json.loads(path.read_text(encoding='utf-8'))
    doc['version'] = '0.9.2-candidate'
    live = doc['renderer']['live2d']
    live['entry'] = 'live-reference-repair-v42-candidate/ChangliReferenceRepairV42-physics.model3.json'
    status = '保留视线、脸型、左侧底边、发束物理和金饰外缘收边；v42新增原生左耳袖口衔接变形，±5度侧倾下缘偏移由37.7降至约6.9原图像素，空隙缩小。凤凰仍为可替换候选底绘；袖口细缝、残白、右饰品遮罩、多角度和完整表情尚未完成。'
    doc['art_status'] = live['art_status'] = status
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    path = HERE / 'desktop-integration-preview.html'
    path.write_text(path.read_text(encoding='utf-8').replace('(31|32|35|36|37|38|39|40|41)', '(31|32|35|36|37|38|39|40|41|42)'), encoding='utf-8')
    print('Published native v42 / 0.5.13 candidate; formalArtComplete remains false')
