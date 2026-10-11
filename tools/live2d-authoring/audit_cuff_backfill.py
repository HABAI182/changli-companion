"""Read-only comparison of identical official-render cuff crops."""
from pathlib import Path
from PIL import Image
import json

HERE = Path(__file__).resolve().parent
original = Image.open(HERE / 'assets/changli-original-clean-alpha-v1.png').convert('RGBA')
roi = (180, 830, 240, 875)
reference = original.crop(roi)
mask = [pixel[3] >= 250 for pixel in reference.getdata()]
crop_box = tuple(v - offset for v, offset in zip(roi, (160, 650, 160, 650)))
samples = []
for pose in range(8):
    counts = []
    for version in (55, 56):
        image = Image.open(HERE / f'build/neck-seam-v{version}-20261008/ear-{pose}.png').convert('RGB')
        counts.append(sum(in_reference and pixel == (23, 39, 48)
                          for in_reference, pixel in zip(mask, image.crop(crop_box).getdata())))
    samples.append({'pose': pose, 'beforeBackgroundPixels': counts[0],
                    'afterBackgroundPixels': counts[1], 'filledPixels': counts[0] - counts[1],
                    'pass': counts[1] <= counts[0]})
native = json.loads((HERE / 'build/reference-repair-v56-core-verification-20261006.json').read_text(encoding='utf-8'))
native_pass = native['pass'] and native['regressions']['pass']
report = {'scope': 'Exact stage-background pixels inside a reference-opaque local ROI; not complete artwork acceptance',
          'referenceRoi': roi, 'samples': samples,
          'pass': native_pass and all(s['pass'] for s in samples) and sum(s['filledPixels'] for s in samples) > 0,
          'nativeGeometryRegressionPass': native_pass, 'formalArtComplete': False,
          'remaining': ['Ear-join straight crop edge', 'Other native cutout edges and larger angles',
                        'Independent main ornaments and fine Phoenix deformation']}
destination = HERE / 'build/cuff-backfill-v56-visual-audit-20261008.json'
destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
if not report['pass']:
    raise SystemExit(1)
