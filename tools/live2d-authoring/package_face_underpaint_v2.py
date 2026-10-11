"""Wrap the full generated candidate unchanged; native Editor does the contour."""
import hashlib
import json
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent
source = HERE / 'assets/changli-face-underpaint-v2-candidate.png'
pixels = Image.open(source).convert('RGBA')
assert pixels.size == (1254, 1254), pixels.size
psd = PSDImage.new(mode='RGB', size=pixels.size, depth=8)
layer = psd.create_pixel_layer(pixels, name='DRAFT FaceUnderpaintV2 - native contour required')
destination = HERE / 'ChangliFaceUnderpaintDraft-v2.psd'
psd.save(destination)
reread = PSDImage.open(destination)
assert reread.size == pixels.size and len(reread) == 1
assert reread[0].topil().convert('RGBA').tobytes() == pixels.tobytes()
report = {'source': source.name, 'size': pixels.size,
          'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'pixelsUnchangedInPsd': True, 'nativeImported': False,
          'artApproved': False, 'formalArtComplete': False,
          'notes': 'Generated blank-eye underpaint only. Keep original contours and separate eyes; native contour and placement required.'}
(HERE / 'build/face-underpaint-v2-packaging-20261002.json').write_text(
    json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
