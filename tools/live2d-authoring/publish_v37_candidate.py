"""Publish the verified native contour candidate into the existing desktop pet."""
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
if __name__=='__main__':
    report=json.loads((HERE/'build/reference-repair-v37-core-verification-20261006.json').read_text())
    if not report['pass']: raise ValueError('v37 official Core did not pass')
    for file in ('package.json','package-lock.json','src-tauri/tauri.conf.json'):
        p=ROOT/file;j=json.loads(p.read_text(encoding='utf-8'));j['version']='0.5.10'
        if file=='package-lock.json':j['packages']['']['version']='0.5.10'
        p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    p=ROOT/'src-tauri/Cargo.toml';p.write_text(p.read_text(encoding='utf-8').replace('version = "0.5.9"','version = "0.5.10"'),encoding='utf-8')
    p=ROOT/'src/App.tsx';p.write_text(p.read_text(encoding='utf-8').replace('v0.5.9','v0.5.10'),encoding='utf-8')
    p=ROOT/'public/models/changli/model.json';j=json.loads(p.read_text(encoding='utf-8'));j['version']='0.8.7-candidate'
    j['renderer']['live2d']['entry']='live-reference-repair-v37-candidate/ChangliReferenceRepairV37-physics.model3.json'
    j['art_status']='v35双眼与左侧羽状底边修复、v36发饰头顶收边、v37右侧飘带遮罩已官方导出验证；凤凰为可替换候选底绘；少量残白、多角度和完整表情尚未完成。'
    p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    p=HERE/'desktop-integration-preview.html';p.write_text(p.read_text(encoding='utf-8').replace('(32|35)','(32|35|36|37)').replace('(31|32|35)','(31|32|35|36|37)'),encoding='utf-8')
    print('Current desktop entry v37, application version 0.5.10; formalArtComplete remains false')
