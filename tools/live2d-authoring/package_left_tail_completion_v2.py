"""Package intact reference pixels; Cubism integration remains pending.

The previous strip began at y820 and ended at y932. It omitted the upper
connection and the dark feather tip extending below the desktop line.
No painting, alpha editing, or resampling is performed here.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent
reference = HERE / 'assets/changli-original-clean-alpha-v1.png'
source = Image.open(reference).convert('RGBA')
doc = PSDImage.new(mode='RGB', size=source.size, depth=8)
# The tip needs to be in front of the desktop. Keep its crop away from the
# mouse so moving the tail does not duplicate the mouse outline.
layers = [
    ('SOURCE LeftTailMain-v2 - native integration pending', (0,750,185,932), 389),
    ('SOURCE LeftTailTip-v2 - native integration pending', (0,932,145,950), 410)
]
for name, box, order in layers:
    doc.create_pixel_layer(source.crop(box), name=name, left=box[0], top=box[1])
destination = HERE / 'ChangliOriginalLeftTailComplete-v2.psd'
doc.save(destination)
restored = PSDImage.open(destination)
for layer, (name, box, order) in zip(restored, layers):
    pixels = source.crop(box)
    assert layer.bbox == box
    assert layer.topil().convert('RGB').tobytes() == pixels.convert('RGB').tobytes()
    assert layer.composite(force=True).getchannel('A').tobytes() == pixels.getchannel('A').tobytes()
report = {
    'reference': str(reference), 'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest().upper(),
    'psd': str(destination), 'psdSha256': hashlib.sha256(destination.read_bytes()).hexdigest().upper(),
    'bbox': [0,750,185,950], 'exactReferenceRgb': True, 'exactReferenceAlpha': True,
    'layers': [{'name':name,'bbox':box,'plannedDrawOrder':order,'plannedParent':'SideHairLeftSwing'} for name,box,order in layers],
    'nativeIntegrated': False, 'formalArtComplete': False,
    'next': 'Replace the v57 tail strip with main389 and tip410 in native Cubism; both follow SideHairLeftSwing. Inspect desk/mouse/hands and all poses before export. Do not add duplicate visible tails.'
}
(HERE / 'build/left-tail-completion-v2-packaging-20261008.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
