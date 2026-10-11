"""Package imagegen RGBA pixels unchanged for native PSD re-import.

No repainting, masking, resampling, color edits or alpha edits take place here.
The source rectangles are copied at their existing document coordinates.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent
original = PSDImage.open(HERE / 'ChangliReferenceRepairSources-v1.psd')
pixels = Image.open(HERE / 'assets/changli-original-clean-alpha-v1.png').convert('RGBA')
assert pixels.size == original.size == (1254,1254)
output = PSDImage.new(mode='RGB', size=original.size, depth=8)
rows = []
for source in original:
    left, top, right, bottom = source.bbox
    layer = output.create_pixel_layer(pixels.crop(source.bbox), name=source.name, left=left, top=top)
    layer.visible = source.visible
    rows.append({'name':source.name,'bbox':list(layer.bbox),'visible':layer.visible})
path = HERE / 'ChangliReferenceRepairSources-clean-alpha-v1.psd'
output.save(path)
restored = PSDImage.open(path)
assert restored.size == output.size
for a,b in zip(output,restored):
    assert a.name == b.name and a.bbox == b.bbox and a.visible == b.visible
    assert a.topil().tobytes() == b.topil().tobytes()
report = {'source':'assets/changli-original-clean-alpha-v1.png',
          'sourceSha256':hashlib.sha256((HERE/'assets/changli-original-clean-alpha-v1.png').read_bytes()).hexdigest(),
          'size':list(pixels.size),'alphaRange':list(pixels.getchannel('A').getextrema()),
          'layers':rows,'pixelRoundtrip':True,'nativeImported':False,'formalArtComplete':False,
          'note':'RGBA artwork produced by built-in imagegen from original; geometry and runtime acceptance pending.'}
(HERE/'build/clean-reference-packaging.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(path)
