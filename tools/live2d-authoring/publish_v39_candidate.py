"""Publish only the independently verified v39 native candidate."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
if __name__ == '__main__':
    report = json.loads((HERE / 'build/reference-repair-v39-core-verification-20261006.json').read_text())
    if not all(report[key]['pass'] for key in ('nativeHeadRotation', 'regressions', 'continuous', 'nativePhysics', 'physicsContinuous')) or not report['pass']:
        raise ValueError('v39 native/Core/physics verification required')
    for file in ('package.json', 'package-lock.json', 'src-tauri/tauri.conf.json'):
        path = ROOT / file
        doc = json.loads(path.read_text(encoding='utf-8'))
        doc['version'] = '0.5.11'
        if file == 'package-lock.json':
            doc['packages']['']['version'] = '0.5.11'
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for file, before, after in (('src-tauri/Cargo.toml', 'version = "0.5.10"', 'version = "0.5.11"'), ('src/App.tsx', 'v0.5.10', 'v0.5.11')):
        path = ROOT / file
        path.write_text(path.read_text(encoding='utf-8').replace(before, after), encoding='utf-8')
    path = ROOT / 'public/models/changli/model.json'
    doc = json.loads(path.read_text(encoding='utf-8'))
    doc['version'] = '0.8.9-candidate'
    live = doc['renderer']['live2d']
    live['entry'] = 'live-reference-repair-v39-candidate/ChangliReferenceRepairV39-physics.model3.json'
    status = '保留v35视线与左侧羽状底边、v36发饰、v37飘带修正；v38左发饰旁四点收边，v39原生头部侧倾端点±5度已官方导出验证。凤凰仍为可替换候选底绘；金饰细边、极端侧倾袖口衔接、头部多角度和完整表情尚未完成。'
    doc['art_status'] = live['art_status'] = status
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    path = HERE / 'desktop-integration-preview.html'
    path.write_text(path.read_text(encoding='utf-8').replace('(31|32|35|36|37)', '(31|32|35|36|37|38|39)'), encoding='utf-8')
    print('Published native v39 / 0.5.11 candidate; formalArtComplete remains false')
