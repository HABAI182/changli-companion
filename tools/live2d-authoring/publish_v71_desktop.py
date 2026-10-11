"""Promote the official v71 model only after current native and adapter checks."""
import hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
core=load(HERE/'build/reference-repair-v71-core-verification-20261006.json')
pipeline=load(HERE/'build/native-export-pipeline-v71-20261006.json')
provenance=load(HERE/'build/reference-repair-v71-provenance-20261006.json')
adapter=load(HERE/'build/input-blink-v71-20261011/verification.json')
visual=load(HERE/'build/blink-v71-visual-review-20261011.json')
if core['version']!=71 or not core['pass'] or not pipeline['pass'] or not adapter['pass'] or not visual['runtimeBlinkAccepted']:
    raise ValueError('Required native/adapter/runtime visual check failed')
for k in ['regressions','rawGeometry','blinkOpacityTransition','continuous','nativePhysics','physicsContinuous','nativeTailCompletion','nativeKeyboardReplacement','nativeEarOcclusion']:
    if not core[k]['pass']:raise ValueError('Verification failed: '+k)
for file,digest in adapter['sourceSha256'].items():
    if sha(ROOT/file)!=digest:raise ValueError('Adapter source changed: '+file)
for p in [HERE/'ChangliReferenceRepair-v71-candidate.cmo3',HERE/'build/ChangliReferenceRepair-v71-20261006.cmo3']:
    if sha(p)!=provenance['authoringSha256']:raise ValueError('Source/export pair changed')
runtime=ROOT/'public/models/changli/live-reference-repair-v71-candidate'
for row in provenance['resources']:
    for base in [runtime,HERE/'build/editor-export-reference-repair-v71-20261006']:
        if sha(base/row['path'])!=row['sha256']:raise ValueError('Official export changed')
if not load(HERE/'build/left-tail-v71-alpha-audit-20261008.json')['tailSilhouettePass']:
    raise ValueError('Tail regression failed')
p=ROOT/'public/models/changli/model.json';doc=load(p)
doc['version']='0.11.8'
doc['renderer']['live2d']['entry']='live-reference-repair-v71-candidate/ChangliReferenceRepairV71-physics.model3.json'
doc['art_status']=doc['renderer']['live2d']['art_status']=(
    '可编辑原生Live2D，43网格、36参数，官方Cubism导出。眨眼改为加速闭合、短暂停留、快速起睁再减速；六层使用互补短过渡，避免近闭眼时长时间叠出淡眼框。'
    '单手键鼠、四种表情、视线跟随、发束挂坠物理与凤凰互动已接入。大小50%—200%连续调节。左侧尾羽与键盘朝向已修复，键盘是可替换生成素材。'
    '大角度头颈袖口接缝、饰品凤凰精细变形与呆毛仍有精修空间。Windows验收单独记录。')
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Published official v71 for Windows0.6.8 acceptance; final-art/native-Windows status stays explicit.')
