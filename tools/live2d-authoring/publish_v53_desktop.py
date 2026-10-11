"""Publish the verified native v53 model and the focused desktop UI together."""
import hashlib
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
report = json.loads((HERE/'build/reference-repair-v53-core-verification-20261006.json').read_text())
required=('regressions','nativeFaceContour','nativeShoulderJoins','nativeGoldContour','nativePhoenix','nativeLeftOrnament','continuous','nativePhysics','physicsContinuous')
if not report['pass'] or not all(report[k]['pass'] for k in required):
    raise ValueError('Native geometry and physical simulation must pass before publication')
provenance=json.loads((HERE/'build/reference-repair-v53-provenance-20261006.json').read_text())
source=HERE/'ChangliReferenceRepair-v53-candidate.cmo3'
if hashlib.sha256(source.read_bytes()).hexdigest().upper()!=provenance['authoringSha256']:
    raise ValueError('Working source changed after official export')
runtime=ROOT/'public/models/changli/live-reference-repair-v53-candidate'
for row in provenance['resources']:
    if hashlib.sha256((runtime/row['path']).read_bytes()).hexdigest().upper()!=row['sha256']:
        raise ValueError('Exported runtime changed')
for name in ('package.json','package-lock.json','src-tauri/tauri.conf.json'):
    p=ROOT/name
    doc=json.loads(p.read_text(encoding='utf-8'))
    if doc['version'] not in ('0.5.16','0.6.0'):
        raise ValueError('Unexpected application version')
    doc['version']='0.6.0'
    if name=='package-lock.json':doc['packages']['']['version']='0.6.0'
    p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ('src-tauri/Cargo.toml','src/App.tsx'):
    p=ROOT/name
    p.write_text(p.read_text(encoding='utf-8').replace('0.5.16','0.6.0'),encoding='utf-8')
p=ROOT/'public/models/changli/model.json'
doc=json.loads(p.read_text(encoding='utf-8'))
doc['version']='0.11.0'
live=doc['renderer']['live2d']
live['entry']='live-reference-repair-v53-candidate/ChangliReferenceRepairV53-physics.model3.json'
live['parameterMap']['head.y']='ParamAngleY'
status=('原生 Live2D：眼球与头部跟随、双手输入、眨眼、头发及左右挂坠物理、凤凰互动和四种表情已接入。'
        '左侧金饰与脸侧边缘已补齐。精细分层美术、完整扩展表情和大角度接缝仍未完成，当前仅使用桌宠小幅转头范围。')
doc['art_status']=live['art_status']=status
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Published v53 / desktop 0.6.0. Final art acceptance remains pending.')
