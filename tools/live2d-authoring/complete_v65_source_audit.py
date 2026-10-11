"""Read-only official-export audit and a small durable stage checkpoint."""
import hashlib
import json
from datetime import datetime
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / 'build/source-audit-v65-20261009'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest().upper()

def main():
    report = json.loads((OUT / 'core-comparison.json').read_text())
    old = HERE / 'build/editor-export-reference-repair-v64-20261006'
    new = HERE / 'build/editor-export-reference-repair-v65-20261006'
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
    print(json.dumps({'pass': report['pass'], 'mocIdentical': report['baselineMocSha256'] == report['newMocSha256'], 'atlasCount': len(textures), 'sourceSha256': report['sourceSha256']}, indent=2))

if __name__ == '__main__':
    main()
