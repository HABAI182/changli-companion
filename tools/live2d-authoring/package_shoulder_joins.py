"""Copy intact original-reference RGBA shoulder pixels for native seam repair.

No image painting, masking, alpha edits, or resampling. These source crops are
placed below the existing face/hair/cuff art and inherit the actual head rig.
"""
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage
HERE=Path(__file__).resolve().parent
source=Image.open(HERE/'assets/changli-original-clean-alpha-v1.png').convert('RGBA')
output=PSDImage.new(mode='RGB',size=source.size,depth=8)
for name,box in [('SOURCE LeftShoulderJoin',(205,752,345,850)),
                 ('SOURCE RightShoulderJoin',(876,771,951,871))]:
    output.create_pixel_layer(source.crop(box),name=name,left=box[0],top=box[1])
destination=HERE/'ChangliOriginalShoulderJoins-v1.psd'
output.save(destination)
restored=PSDImage.open(destination)
assert all(a.bbox==b.bbox and a.composite(force=True).tobytes()==b.composite(force=True).tobytes() for a,b in zip(output,restored))
print(destination)
