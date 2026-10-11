"""Wrap generated RGBA unchanged; sizing is authored in native Cubism geometry."""
from pathlib import Path
import hashlib, json, shutil
from PIL import Image
from psd_tools import PSDImage
HERE=Path(__file__).resolve().parent
generated=Path('C:/Users/18769/.codex/generated_images/01a0d103-6dcf-7963-912d-a6a39531c986/exec-4b06fe8e-aab5-4db3-8541-ad3edab0e417.png')
asset=HERE/'assets/keyboard-facing-character-v1.png'
shutil.copy2(generated,asset)
source=Image.open(asset).convert('RGBA')
# Framing only: retain every RGBA sample inside the keyboard rectangle.
box=(48,223,2033,609)
pixels=source.crop(box)
doc=PSDImage.new(mode='RGB',size=(1254,1254),depth=8)
doc.create_pixel_layer(pixels,name='DRAFT KeyboardFacingCharacter - generated replacement',left=275,top=927)
destination=HERE/'ChangliKeyboardFacingCharacter-v1.psd'
doc.save(destination)
restored=PSDImage.open(destination)[0]
assert restored.topil().convert('RGB').tobytes()==pixels.convert('RGB').tobytes()
assert restored.composite(force=True).getchannel('A').tobytes()==pixels.getchannel('A').tobytes()
(HERE/'build/keyboard-facing-character-packaging-20261008.json').write_text(json.dumps({
 'generatedAsset':str(asset),'sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),
 'sourceCrop':box,'sourceRgbaPreserved':True,'nativeSizingPending':True,
 'intendedNativeBounds':[275,927,1201,1087],
 'artStatus':'Generated replacement candidate; spacebar faces character; native and visual verification required'
},indent=2)+'\n',encoding='utf-8')
print(destination)
