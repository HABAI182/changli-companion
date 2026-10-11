"""Wrap intact original pixels extending beyond the old y=930 source crop.

This preserves source RGBA exactly; native Cubism supplies parent and order.
It does not repaint, resample, or alter alpha.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent
reference = HERE / 'assets/changli-original-clean-alpha-v1.png'
source = Image.open(reference).convert('RGBA')
box = (0, 820, 224, 932)
pixels = source.crop(box)
doc = PSDImage.new(mode='RGB', size=source.size, depth=8)
doc.create_pixel_layer(pixels, name='SOURCE LeftTailComplete - intact reference', left=box[0], top=box[1])
destination = HERE / 'ChangliOriginalLeftTailComplete-v1.psd'
doc.save(destination)
restored = PSDImage.open(destination)
assert restored[0].bbox == box
assert restored[0].topil().convert('RGB').tobytes() == pixels.convert('RGB').tobytes()
assert restored[0].composite(force=True).getchannel('A').tobytes() == pixels.getchannel('A').tobytes()
(HERE / 'build/left-tail-completion-packaging-20261008.json').write_text(json.dumps({
    'reference': str(reference), 'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
    'bbox': box, 'exactReferencePixels': True, 'nativeIntegrated': False,
    'reason': 'Restore lower silhouette omitted by prior source crop/native contour; visual pose review required'
}, indent=2) + '\n', encoding='utf-8')
print(destination)
