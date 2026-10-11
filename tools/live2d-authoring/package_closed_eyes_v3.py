"""Package unchanged generated pixels; eye contours are authored in Cubism."""
import hashlib
import json
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

here = Path(__file__).resolve().parent
source = here / 'assets/changli-closed-eyes-v3-candidate.png'
pixels = Image.open(source).convert('RGBA')
assert pixels.size == (1254, 1254)
psd = PSDImage.new(mode='RGB', size=pixels.size, depth=8)
psd.create_pixel_layer(pixels, name='DRAFT ClosedEyesV3 - native contours required')
destination = here / 'ChangliClosedEyesDraft-v3.psd'
psd.save(destination)
assert PSDImage.open(destination)[0].topil().convert('RGBA').tobytes() == pixels.tobytes()
report = {'source': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'pixelsUnchangedInPsd': True, 'nativeImported': False, 'artApproved': False,
          'formalArtComplete': False}
(here / 'build/closed-eyes-v3-packaging-20261003.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
