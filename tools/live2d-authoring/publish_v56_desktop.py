"""Promote the official, regression-verified cuff backfill to desktop 0.6.2."""
import hashlib
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
report=json.loads((HERE/'build/reference-repair-v56-core-verification-20261006.json').read_text())
required=('nativeCuffBackfill','nativeFaceLayering','regressions','continuous','nativePhysics','physicsContinuous')
if not report['pass'] or not all(report[k]['pass'] for k in required):
    raise ValueError('Official Core, native backfill and physics verification required')
visual=json.loads((HERE/'build/cuff-backfill-v56-visual-audit-20261008.json').read_text())
if not visual['pass'] or any(s['afterBackgroundPixels'] for s in visual['samples']):
    raise ValueError('Local cuff hole must be covered in all eight reviewed poses')
provenance=json.loads((HERE/'build/reference-repair-v56-provenance-20261006.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
if sha(HERE/'ChangliReferenceRepair-v56-candidate.cmo3')!=provenance['authoringSha256']:
    raise ValueError('Working native source changed after export')
runtime=ROOT/'public/models/changli/live-reference-repair-v56-candidate'
for row in provenance['resources']:
    if sha(runtime/row['path'])!=row['sha256']:
        raise ValueError('Official runtime resource changed')
for name in ('package.json','package-lock.json','src-tauri/tauri.conf.json'):
    p=ROOT/name;doc=json.loads(p.read_text(encoding='utf-8'))
    if doc['version'] not in ('0.6.1','0.6.2'):raise ValueError('Unexpected desktop version')
    doc['version']='0.6.2'
    if name=='package-lock.json':doc['packages']['']['version']='0.6.2'
    p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ('src-tauri/Cargo.toml','src/App.tsx'):
    p=ROOT/name;p.write_text(p.read_text(encoding='utf-8').replace('0.6.1','0.6.2'),encoding='utf-8')
p=ROOT/'public/models/changli/model.json';doc=json.loads(p.read_text(encoding='utf-8'))
doc['version']='0.11.2';live=doc['renderer']['live2d']
live['entry']='live-reference-repair-v56-candidate/ChangliReferenceRepairV56-physics.model3.json'
status=('原生 Live2D：眼球与头部跟随、双手输入、眨眼、头发及左右挂坠物理、凤凰互动和四种表情已接入。'
        '闭眼残线、摸头表情恢复及左袖口局部透明缺口已修正。'
        '耳饰连接层裁边、精细分层美术、完整扩展表情和大角度接缝仍需精修。')
doc['art_status']=live['art_status']=status
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Published verified native v56 / desktop 0.6.2. Final artwork remains pending.')
