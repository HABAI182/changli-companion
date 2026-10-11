"""Place intact reference pixels in a native PSD layer for Cubism authoring.

No painting, alpha change, scaling, or runtime image substitution. The layer
must be imported, assigned a parent/order, and officially exported in Cubism.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent
reference = HERE / 'assets/changli-original-clean-alpha-v1.png'
original = Image.open(reference).convert('RGBA')
box = (170, 800, 260, 910)
pixels = original.crop(box)
document = PSDImage.new(mode='RGB', size=original.size, depth=8)
document.create_pixel_layer(pixels, name='SOURCE LeftCuffBackfill - intact reference',
                            left=box[0], top=box[1])
destination = HERE / 'ChangliOriginalCuffBackfill-v1.psd'
document.save(destination)
restored = PSDImage.open(destination)
assert restored.size == original.size
assert restored[0].bbox == box
assert restored[0].composite(force=True).tobytes() == pixels.tobytes()
report = {'scope': 'Native authoring source only; not integrated or art-approved',
          'reference': str(reference), 'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
          'destination': str(destination), 'bbox': box,
          'exactReferencePixels': True, 'nativeIntegrationVerified': False}
(HERE / 'build/cuff-backfill-packaging-20261008.json').write_text(
    json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(destination)
