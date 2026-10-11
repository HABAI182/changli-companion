"""Publish the input/blink code fix while preserving official v60 bytes."""
import hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
report=load(HERE/'build/input-blink-20261008/core-verification.json')
if not report['pass']:raise ValueError('Actual Core input/blink verification failed')
provenance=load(HERE/'build/reference-repair-v60-provenance-20261006.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
if sha(HERE/'ChangliReferenceRepair-v60-candidate.cmo3')!=provenance['authoringSha256']:raise ValueError('Native source changed')
for row in provenance['resources']:
    if sha(ROOT/'public/models/changli/live-reference-repair-v60-candidate'/row['path'])!=row['sha256']:raise ValueError('Official model resource changed')
for name in ('package.json','package-lock.json','src-tauri/tauri.conf.json'):
    p=ROOT/name;doc=load(p)
    if doc['version'] not in ('0.6.4','0.6.5'):raise ValueError('Unexpected version')
    doc['version']='0.6.5'
    if name=='package-lock.json':doc['packages']['']['version']='0.6.5'
    p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ('src-tauri/Cargo.toml','src/App.tsx'):
    p=ROOT/name;p.write_text(p.read_text(encoding='utf-8').replace('0.6.4','0.6.5'),encoding='utf-8')
p=ROOT/'public/models/changli/model.json';doc=load(p);doc['version']='0.11.5'
status=('原生 Live2D：眼球与头部跟随、单手键鼠输入、眨眼、发束和挂坠物理、凤凰互动及四种表情已接入。'
        '键鼠模式键盘只用右手、鼠标只用左手，已通过正式 MOC3 逐帧验证；眨眼改为快闭合、短停留、慢睁开，画面观感仍需复核。'
        '左侧尾羽补全、键盘朝向替换和左耳连接层遮挡沿用 v60；键盘为可替换生成素材。精细分层和大角度接缝仍需精修，呆毛暂缓。')
doc['art_status']=doc['renderer']['live2d']['art_status']=status
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Published desktop 0.6.5 code / unchanged official v60 model; visual blink acceptance pending.')
