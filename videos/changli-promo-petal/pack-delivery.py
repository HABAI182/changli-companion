"""Package only finished deliverables and the self-contained Hyperframes project."""
from pathlib import Path
import hashlib, json, zipfile

PROJECT = Path(__file__).resolve().parent
REPO = PROJECT.parent.parent
OUT = REPO / 'deliveries/media-20261012-hyperframes-v2'
ZIP = OUT / 'changli-bilibili-hyperframes-v2-20261012.zip'

report = json.loads((OUT / 'VIDEO-VERIFICATION.json').read_text(encoding='utf-8'))
assert len(report['outputs']) == 4 and all(x['fullDecodePassed'] for x in report['outputs'])
if ZIP.exists():
    raise SystemExit('An archive already exists; preserve it and choose a new archive version')

files = [OUT / x['file'] for x in report['outputs']]
files += [OUT / n for n in ['cover-wide-1920x1080.png', 'cover-bilibili-1200x900.png',
                           'BILIBILI-PUBLISH.md', 'BGM-SOURCE.json', 'VIDEO-VERIFICATION.json',
                           'DELIVERY-README.md']]
checksums = ''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in files)
(OUT / 'CHECKSUMS-SHA256.txt').write_text(checksums, encoding='utf-8')
files.append(OUT / 'CHECKSUMS-SHA256.txt')

roots = ['.gitignore', 'AGENTS.md', 'BRIEF.md', 'README.md', 'STORYBOARD.md', 'frame.md',
         'ASSET-SOURCES.json', 'audio_meta.json', 'capture-report.json', 'build-film.cjs',
         'capture-model.cjs', 'capture-settings.cjs', 'verify-outputs.cjs', 'pack-delivery.py',
         'hyperframes.json', 'hyperframes.lock.json', 'index.html', 'meta.json', 'package.json']
sources = [PROJECT / n for n in roots]
sources += sorted((PROJECT / 'compositions').rglob('*.html'))
sources += sorted((PROJECT / 'layouts').glob('*.html.source'))
sources += [p for p in sorted((PROJECT / 'assets').iterdir()) if p.is_file() and p.name != 'NotoSansSC.ttf']

with zipfile.ZipFile(ZIP, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=5) as z:
    for p in files:
        z.write(p, p.name)
    for p in sources:
        z.write(p, 'project/' + p.relative_to(PROJECT).as_posix())
    z.write(REPO / 'tools/promo/make_music.py', 'music-source/make_music.py')
    for p in [PROJECT / 'check-wide.json', PROJECT / 'check-portrait.json']:
        text = p.read_text(encoding='utf-8')
        payload = json.loads(text[text.index('{'):])
        z.writestr('verification/' + p.name, json.dumps(payload, ensure_ascii=False, indent=2))

with zipfile.ZipFile(ZIP) as z:
    assert z.testzip() is None
    paths = set(z.namelist())
    assert 'project/assets/hero.webm' in paths and 'project/assets/NotoSansSC-promo.ttf' in paths
    assert 'project/assets/OFL-NotoSansSC.txt' in paths
    for p in files:
        assert hashlib.sha256(z.read(p.name)).hexdigest() == hashlib.sha256(p.read_bytes()).hexdigest()

digest = hashlib.sha256(ZIP.read_bytes()).hexdigest()
(OUT / 'PACKAGE-SHA256.txt').write_text(digest + '  ' + ZIP.name + '\n', encoding='utf-8')
print(json.dumps({'archive': str(ZIP), 'bytes': ZIP.stat().st_size, 'sha256': digest, 'verified': True}))
