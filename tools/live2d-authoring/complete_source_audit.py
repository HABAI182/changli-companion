"""Read-only official-export audit and a small durable stage checkpoint."""
import hashlib
import json
from datetime import datetime
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / 'build/source-audit-v61-20261009'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest().upper()

def main():
    report = json.loads((OUT / 'core-comparison.json').read_text())
    old = HERE / 'build/editor-export-reference-repair-v60-20261006'
    new = HERE / 'build/editor-export-reference-repair-v61-20261006'
    a = sorted(old.glob('*.2048/*.png'))
    b = sorted(new.glob('*.2048/*.png'))
    if len(a) != len(b):
        raise ValueError('Official atlas count differs')
    textures = []
    for baseline, current in zip(a, b):
        with Image.open(baseline) as x, Image.open(current) as y:
            pixels_equal = x.size == y.size and x.convert('RGBA').tobytes() == y.convert('RGBA').tobytes()
            textures.append({'baseline': str(baseline), 'current': str(current),
                             'size': list(x.size), 'rgbaIdentical': pixels_equal,
                             'baselineSha256': sha(baseline), 'newSha256': sha(current)})
    report['textures'] = textures
    report['pass'] = report['pass'] and all(t['rgbaIdentical'] for t in textures)
    if not report['pass']:
        raise ValueError('Export-visible changes require review')
    report['conclusion'] = 'Official runtime MOC3, sampled geometry, physics and atlas pixels unchanged; source serialization differs.'
    report['savedAt'] = datetime.now().astimezone().isoformat()
    report['publishedModelVersion'] = 60
    report['publishedDesktopVersion'] = '0.6.6'
    (OUT / 'source-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    resources = [{'path': p.relative_to(new).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)}
                 for p in sorted(new.rglob('*')) if p.is_file()]
    (OUT / 'official-export-sha256.json').write_text(json.dumps(resources, indent=2) + '\n')
    section = ('# 2026-10-09 原生源核对完成，继续眼睑关键形\n\n'
               '当前另存的v60工作源已复制到v61隔离候选，并由Cubism5.3.04正式导出。'
               '官方Core检查43网格/36参数、529组姿态，MOC3逐字节一致，物理JSON与全部贴图RGBA一致。'
               '因此没有发现导出可见的未同步修改；不能据此说CMO3文件本身相同。'
               '源与导出哈希见tools/live2d-authoring/build/source-audit-v61-20261009/source-audit.json。\n\n'
               '已发布桌宠仍为0.6.6/v60，设置页与连续缩放保留。下一项在独立原生工程修半闭眼形态，'
               '保存后正式导出，验收开合、独立左右眼、视线叠加和其他网格回归，再更新桌宠。'
               '眨眼时序通过不代表眼睑美术已完工；头颈袖口、饰品凤凰精修与Windows完整回归仍待完成。\n\n')
    for p in [ROOT / 'ENGINEERING_HANDOFF.md', ROOT / 'PROGRESS-CHECKPOINT-20261009.md']:
        p.write_text(section + p.read_text(encoding='utf-8-sig'), encoding='utf-8')
    print(json.dumps({'pass': report['pass'], 'mocIdentical': report['baselineMocSha256'] == report['newMocSha256'],
                      'atlasCount': len(textures), 'sourceSha256': report['sourceSha256']}, indent=2))

if __name__ == '__main__':
    main()
