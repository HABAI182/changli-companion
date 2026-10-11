"""Promote only the verified official v55 model to desktop 0.6.1."""
import hashlib
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
report = json.loads((HERE / 'build/reference-repair-v55-core-verification-20261006.json').read_text())
required = ('nativeFaceLayering', 'regressions', 'continuous', 'nativePhysics', 'physicsContinuous')
if not report['pass'] or not all(report[k]['pass'] for k in required):
    raise ValueError('Official Core and native layering verification required')
provenance = json.loads((HERE / 'build/reference-repair-v55-provenance-20261006.json').read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
if sha(HERE / 'ChangliReferenceRepair-v55-candidate.cmo3') != provenance['authoringSha256']:
    raise ValueError('Working native source changed after export')
runtime = ROOT / 'public/models/changli/live-reference-repair-v55-candidate'
for row in provenance['resources']:
    if sha(runtime / row['path']) != row['sha256']:
        raise ValueError('Official runtime resource changed')
for name in ('package.json', 'package-lock.json', 'src-tauri/tauri.conf.json'):
    p = ROOT / name
    doc = json.loads(p.read_text(encoding='utf-8'))
    if doc['version'] not in ('0.6.0', '0.6.1'):
        raise ValueError('Unexpected desktop version')
    doc['version'] = '0.6.1'
    if name == 'package-lock.json': doc['packages']['']['version'] = '0.6.1'
    p.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for name in ('src-tauri/Cargo.toml', 'src/App.tsx'):
    p = ROOT / name
    p.write_text(p.read_text(encoding='utf-8').replace('0.6.0', '0.6.1'), encoding='utf-8')
p = ROOT / 'public/models/changli/model.json'
doc = json.loads(p.read_text(encoding='utf-8'))
doc['version'] = '0.11.1'
live = doc['renderer']['live2d']
live['entry'] = 'live-reference-repair-v55-candidate/ChangliReferenceRepairV55-physics.model3.json'
status = ('原生 Live2D：眼球与头部跟随、双手输入、眨眼、头发及左右挂坠物理、凤凰互动和四种表情已接入。'
          '闭眼左眼下方的旧睫毛残线已修正，摸头可短暂开心闭眼并恢复。'
          '精细分层美术、完整扩展表情和大角度接缝仍未完成，当前使用桌宠小幅转头范围。')
doc['art_status'] = live['art_status'] = status
p.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Published verified native v55 / desktop 0.6.1. Final artwork acceptance remains pending.')
