"""Preserve component pixels in the existing PSD names/rectangles."""
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage
HERE=Path(__file__).resolve().parent
old=PSDImage.open(HERE/'ChangliEyeComponentsDraft-v1.psd')
pixels=Image.open(HERE/'assets/eye-sclera-rim-v2-candidate.png').convert('RGBA')
irises=Image.open(HERE/'assets/eye-irises-v1-candidate.png').convert('RGBA')
assert pixels.size==old.size==(1254,1254)
out=PSDImage.new(mode='RGB',size=old.size,depth=8)
for source in old:
    # topil() omits the PSD layer's transparency mask. Copy the original PNG
    # alpha directly; copying topil() made the iris corners opaque black.
    image=(pixels if 'Sclera' in source.name else irises).crop(source.bbox)
    layer=out.create_pixel_layer(image,name=source.name,left=source.left,top=source.top)
    layer.visible=source.visible
destination=HERE/'ChangliEyeComponents-rim-v3.psd'
out.save(destination)
restored=PSDImage.open(destination)
assert all(a.bbox==b.bbox and a.topil().tobytes()==b.topil().tobytes() for a,b in zip(out,restored))
for layer in restored:
    assert layer.composite(force=True).getchannel('A').getextrema()[0] == 0
print(destination)
