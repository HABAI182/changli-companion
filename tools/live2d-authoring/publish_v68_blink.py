"""Select the verified official native model for desktop QA, preserving provenance."""
import hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
core=load(HERE/'build/reference-repair-v68-core-verification-20261006.json')
pipeline=load(HERE/'build/native-export-pipeline-v68-20261006.json')
provenance=load(HERE/'build/reference-repair-v68-provenance-20261006.json')
if core['version']!=68 or not core['pass'] or not pipeline['pass']:raise ValueError('Native verification failed')
for k in ['regressions','rawGeometry','blinkOpacityTransition','continuous','nativePhysics','physicsContinuous','nativeTailCompletion','nativeKeyboardReplacement','nativeEarOcclusion']:
    if not core[k]['pass']:raise ValueError('Required verification failed:'+k)
for p in [HERE/'ChangliReferenceRepair-v68-candidate.cmo3',HERE/'build/ChangliReferenceRepair-v68-20261006.cmo3']:
    if sha(p)!=provenance['authoringSha256']:raise ValueError('Source/export pair changed')
runtime=ROOT/'public/models/changli/live-reference-repair-v68-candidate'
for row in provenance['resources']:
    for base in [runtime,HERE/'build/editor-export-reference-repair-v68-20261006']:
        if sha(base/row['path'])!=row['sha256']:raise ValueError('Official export changed')
if not load(HERE/'build/left-tail-v68-alpha-audit-20261008.json')['tailSilhouettePass']:raise ValueError('Tail regression failed')
p=ROOT/'public/models/changli/model.json';doc=load(p)
doc['version']='0.11.7'
doc['renderer']['live2d']['entry']='live-reference-repair-v68-candidate/ChangliReferenceRepairV68-physics.model3.json'
doc['art_status']=doc['renderer']['live2d']['art_status']=('原生 Live2D：右眼闭合变形、两眼轮廓过渡和闭合端点已修正；529组姿态、原生物理及2002次透明度曲线检查通过。'
 '单手键鼠输入、发束挂坠物理、凤凰互动与四种表情已接入。设置采用简洁卡片界面，大小在50%至200%连续调节。'
 '左侧尾羽补全与键盘朝向沿用已验证素材；键盘为可替换生成素材。大角度头颈袖口接缝、饰品与凤凰精细变形仍待精修，呆毛暂缓。')
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# The static v64 review did not approve the subsequently inspected animation.
p=HERE/'build/blink-v64-visual-review-20261009.json'
if p.exists():
    old=load(p);old.update(dynamicVisualAccepted=False,dynamicVisualRejected=True,dynamicFailure='Double eye contours during near-closed crossfade',contactSheet='build/blink-v64-contact-sheet-20261009.png')
    p.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Selected official v68 for desktop0.6.7 QA. Native Windows and final art acceptance remain separate.')
