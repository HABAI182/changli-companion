"""Promote exact Cubism v59 bytes after regression and tail visual review."""
import hashlib
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
def load(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
core=load(HERE/'build/reference-repair-v59-core-verification-20261006.json')
for key in ('regressions','nativeTailCompletion','nativeKeyboardReplacement','continuous','nativePhysics','physicsContinuous'):
    if not core[key]['pass']:raise ValueError(f'Required check failed: {key}')
if not core['pass']:raise ValueError('Core failed')
alpha=load(HERE/'build/left-tail-v59-alpha-audit-20261008.json')
visual=load(HERE/'build/left-tail-v59-visual-acceptance-20261008.json')
if not alpha['tailSilhouettePass'] or not visual['tailRepairAccepted']:raise ValueError('Tail review pending')
provenance=load(HERE/'build/reference-repair-v59-provenance-20261006.json')
if sha(HERE/'ChangliReferenceRepair-v59-candidate.cmo3')!=provenance['authoringSha256']:raise ValueError('Native source changed')
runtime=ROOT/'public/models/changli/live-reference-repair-v59-candidate'
for row in provenance['resources']:
    if sha(runtime/row['path'])!=row['sha256']:raise ValueError('Official resource changed')
for name in ('package.json','package-lock.json','src-tauri/tauri.conf.json'):
    p=ROOT/name;doc=load(p)
    if doc['version'] not in ('0.6.2','0.6.3'):raise ValueError('Unexpected desktop version')
    doc['version']='0.6.3'
    if name=='package-lock.json':doc['packages']['']['version']='0.6.3'
    p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ('src-tauri/Cargo.toml','src/App.tsx'):
    p=ROOT/name;p.write_text(p.read_text(encoding='utf-8').replace('0.6.2','0.6.3'),encoding='utf-8')
p=ROOT/'public/models/changli/model.json';doc=load(p)
doc['version']='0.11.3';live=doc['renderer']['live2d']
live['entry']='live-reference-repair-v59-candidate/ChangliReferenceRepairV59-physics.model3.json'
status=('原生 Live2D：眼球与头部跟随、双手输入、眨眼、发束和挂坠物理、凤凰互动及四种表情已接入。'
        '闭眼残线、摸头恢复、左袖口及左侧尾羽缺角已修正；尾羽摆动减小拉扯。'
        '键盘朝向已替换，键盘为可替换生成素材。耳饰裁边、精细分层和大角度接缝仍需精修。')
doc['art_status']=live['art_status']=status
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Published official v59 / desktop 0.6.3; final art remains pending.')
