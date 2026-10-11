"""Promote the saved official v64 blink repair after scoped visual inspection."""
import hashlib
import json
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
def load(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def write(p, doc): p.write_text(json.dumps(doc, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

core = load(HERE/'build/reference-repair-v64-core-verification-20261006.json')
pipeline = load(HERE/'build/native-export-pipeline-v64-20261006.json')
if core['version'] != 64 or not core['pass'] or not pipeline['pass']:
    raise ValueError('Actual v64 export/Core pipeline did not pass')
for key in ('regressions','continuous','nativePhysics','physicsContinuous','nativeTailCompletion','nativeKeyboardReplacement','nativeEarOcclusion'):
    if not core[key]['pass']: raise ValueError('Required check failed: '+key)
if not load(HERE/'build/left-tail-v64-alpha-audit-20261008.json')['tailSilhouettePass']:
    raise ValueError('Tail alpha regression failed')
provenance = load(HERE/'build/reference-repair-v64-provenance-20261006.json')
paired_source = HERE/'build/ChangliReferenceRepair-v64-20261006.cmo3'
if sha(paired_source) != provenance['authoringSha256']:
    raise ValueError('Verified native source/export pair changed')
current_source = HERE/'ChangliReferenceRepair-v64-candidate.cmo3'
if sha(current_source) != provenance['authoringSha256']:
    audit = load(HERE/'build/source-audit-v65-20261009/source-audit.json')
    if (not audit['pass'] or audit['sourceVersion'] != 65 or audit['baselineVersion'] != 64
        or audit['sourceSha256'] != sha(current_source)
        or audit['sourceSha256'] != sha(HERE/'ChangliReferenceRepair-v65-candidate.cmo3')
        or audit['baselineMocSha256'] != audit['newMocSha256']
        or audit['newMocSha256'] != provenance['resources'][0]['sha256']):
        raise ValueError('Re-saved source has not passed an exact official-export audit')
runtime = ROOT/'public/models/changli/live-reference-repair-v64-candidate'
for row in provenance['resources']:
    for base in (runtime,HERE/'build/editor-export-reference-repair-v64-20261006'):
        if sha(base/row['path']) != row['sha256']: raise ValueError('Official resource changed')

# These are the actual images inspected in this stage, not a blanket art approval.
proof = HERE/'build/art-review-v64-20261007'
visual = {'savedAt':datetime.now().astimezone().isoformat(),'version':64,
    'halfwayRightIrisResidueRemoved':True,'halfwayEyeContoursAccepted':True,
    'closedContoursAccepted':True,'nativeAnimationObserved':False,
    'formalArtComplete':False,'remaining':['Large-angle neck/cuff seams','Independent ornament and phoenix deformation','Windows animation and input acceptance'],
    'images':[{'file':str(proof/name),'sha256':sha(proof/name)} for name in ('half-dark.png','closed-dark.png')],
    'scope':'Scoped human/model inspection of rendered official SDK half/closed images. Full dynamic/native desktop acceptance remains separate.'}
write(HERE/'build/blink-v64-visual-review-20261009.json',visual)

for name in ('package.json','package-lock.json','src-tauri/tauri.conf.json'):
    p=ROOT/name;doc=load(p)
    if doc['version'] not in ('0.6.6','0.6.7'): raise ValueError('Unexpected app version')
    doc['version']='0.6.7'
    if name=='package-lock.json':doc['packages']['']['version']='0.6.7'
    write(p,doc)
for name in ('src-tauri/Cargo.toml','src-tauri/Cargo.lock','src/App.tsx'):
    p=ROOT/name;p.write_text(p.read_text(encoding='utf-8').replace('0.6.6','0.6.7'),encoding='utf-8')
p=ROOT/'public/models/changli/model.json';doc=load(p)
doc['version']='0.11.6'
doc['renderer']['live2d']['entry']='live-reference-repair-v64-candidate/ChangliReferenceRepairV64-physics.model3.json'
status=('原生 Live2D：右眼眼眶接入闭眼变形，半闭时的虹膜残影及闭合网格翻折已修正；'
        '529 组姿态与1200帧原生物理通过。单手键鼠输入、发束/挂坠物理、凤凰互动与四种表情已接入。'
        '设置采用简洁卡片界面，大小可在50%至200%连续调节。左侧尾羽补全与键盘朝向修正沿用已验证素材；'
        '键盘为可替换生成素材。大角度头颈/袖口接缝、饰品及凤凰精细变形仍需精修，呆毛暂缓。')
doc['art_status']=doc['renderer']['live2d']['art_status']=status
write(p,doc)
print('Promoted exact official v64 to desktop0.6.7; formal art/native acceptance remain incomplete.')
