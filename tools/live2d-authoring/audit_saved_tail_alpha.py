"""Read-only comparison of saved official-render evidence with reference alpha.

This audits the previously rendered v57 export, not the later edited source.
No image pixels are changed and this is not native Windows verification.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
reference = HERE / 'assets/changli-original-clean-alpha-v1.png'
render = HERE / 'build/keyboard-tail-v57-20261008/neutral-dark.png'
original = Image.open(reference).convert('RGBA')
actual = Image.open(render).convert('RGB')
assert original.size == actual.size == (1254, 1254)
background = actual.getpixel((0, 0))
assert background == (23, 39, 48), 'Unexpected screenshot background'
regions = {'upperJoin': (45,775,155,825), 'lowerTip': (15,932,140,950), 'fullTail': (0,775,185,950)}
rows = []
for name, box in regions.items():
    opaque = []
    missing = []
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            if original.getpixel((x,y))[3] < 240:
                continue
            opaque.append((x,y))
            if actual.getpixel((x,y)) == background:
                missing.append((x,y))
    rows.append({'name':name, 'bounds':box, 'referenceOpaque':len(opaque),
                 'missingOpaque':len(missing), 'examples':missing[:12],
                 'missingBounds': [min(x for x,y in missing),min(y for x,y in missing),
                                   max(x for x,y in missing)+1,max(y for x,y in missing)+1] if missing else None})
provenance = json.loads((HERE/'build/reference-repair-v57-provenance-20261006.json').read_text(encoding='utf-8-sig'))
report = {'version':57, 'savedRender':str(render), 'renderSha256':hashlib.sha256(render.read_bytes()).hexdigest().upper(),
          'exportSourceSha256':provenance['authoringSha256'],
          'workingSourceSha256':hashlib.sha256((HERE/'ChangliReferenceRepair-v57-candidate.cmo3').read_bytes()).hexdigest().upper(),
          'sourceAndRenderMatch':False, 'regions':rows,
          'tailSilhouettePass':all(row['missingOpaque']==0 for row in rows),
          'formalArtComplete':False, 'windowsDesktopVerified':False,
          'scope':'Saved neutral SDK screenshot only. Counts identify missing reference opacity; they do not accept joins or poses.'}
target = HERE/'build/left-tail-v57-saved-render-audit-20261008.json'
target.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
