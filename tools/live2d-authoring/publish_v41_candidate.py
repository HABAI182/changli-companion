"""Publish the independently verified native contour refinement to the pet."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

if __name__ == '__main__':
    for version in (40, 41):
        report = json.loads((HERE / f'build/reference-repair-v{version}-core-verification-20261006.json').read_text())
        if not report['pass'] or not all(report[k]['pass'] for k in ('contourRepair', 'regressions', 'continuous', 'nativePhysics', 'physicsContinuous')):
            raise ValueError(f'v{version} official Core/contour/physics verification required')
    for file in ('package.json', 'package-lock.json', 'src-tauri/tauri.conf.json'):
        path = ROOT / file
        doc = json.loads(path.read_text(encoding='utf-8'))
        if doc['version'] not in ('0.5.11', '0.5.12'):
            raise ValueError('Unexpected app baseline')
        doc['version'] = '0.5.12'
        if file == 'package-lock.json':
            doc['packages']['']['version'] = '0.5.12'
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for file, before, after in (('src-tauri/Cargo.toml', 'version = "0.5.11"', 'version = "0.5.12"'), ('src/App.tsx', 'v0.5.11', 'v0.5.12')):
        path = ROOT / file
        path.write_text(path.read_text(encoding='utf-8').replace(before, after), encoding='utf-8')
    path = ROOT / 'public/models/changli/model.json'
    doc = json.loads(path.read_text(encoding='utf-8'))
    doc['version'] = '0.9.1-candidate'
    live = doc['renderer']['live2d']
    live['entry'] = 'live-reference-repair-v41-candidate/ChangliReferenceRepairV41-physics.model3.json'
    status = '保留已有视线、脸型、发束物理与左侧底边修正；v40/v41原生金饰外缘五点收边已官方导出验证，头部侧倾端点仍为±5度。凤凰仍为可替换候选底绘；剩余细白边、右饰品遮罩、极端侧倾袖口、多角度和完整表情尚未完成。'
    doc['art_status'] = live['art_status'] = status
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    path = HERE / 'desktop-integration-preview.html'
    path.write_text(path.read_text(encoding='utf-8').replace('(31|32|35|36|37|38|39)', '(31|32|35|36|37|38|39|40|41)'), encoding='utf-8')
    print('Published native v41 / 0.5.12 candidate; formalArtComplete remains false')
