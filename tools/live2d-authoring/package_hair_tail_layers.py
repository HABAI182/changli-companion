"""Package candidate pixels, without painting or resampling, for native calibration."""
import hashlib
import json
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent

def package(name, rows):
    psd = PSDImage.new(mode='RGB', size=(1254, 1254), depth=8)
    report = []
    for filename, label, placement in rows:
        source = HERE/'assets'/filename
        pixels = Image.open(source).convert('RGBA')
        assert pixels.size == (1254,1254)
        alpha = pixels.getchannel('A')
        assert alpha.getextrema() == (0,255)
        bounds = alpha.point(lambda a: 255 if a >= 8 else 0).getbbox()
        assert bounds
        left, top = placement or bounds[:2]
        layer = psd.create_pixel_layer(pixels.crop(bounds), name=label, left=left, top=top)
        report.append({'file':filename,'label':label,'sourceBounds':bounds,'psdBounds':layer.bbox,
                       'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                       'status':'candidate; native scale and seam calibration required'})
    destination=HERE/name
    psd.save(destination)
    check=PSDImage.open(destination)
    assert check.size == (1254,1254) and len(check)==len(rows)
    for original, restored in zip(psd,check):
        assert original.bbox==restored.bbox
        assert original.topil().tobytes()==restored.topil().tobytes()
    (HERE/'build'/f'{destination.stem}-packaging.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return report

def main():
    reports = {}
    reports['tail'] = package('ChangliPhoenixTailDraft.psd',[
        ('phoenix-tail-v2.png','DRAFT PhoenixTail', (1090,820)),
        ('phoenix-body-v1.png','DRAFT PhoenixBody', (1010,750)),
    ])
    reports['hair'] = package('ChangliHairCuffDraft.psd',[
        ('hair-underpaint-v1.png','DRAFT HairUnderpaint',None),
        ('hair-left-v1.png','DRAFT HairLeft',None),
        ('hair-right-v1.png','DRAFT HairRight',None),
        ('hair-front-v1.png','DRAFT HairFront',None),
        ('hand-left-v2.png','DRAFT CuffLeft',(190,800)),
        ('hand-right-v3.png','DRAFT CuffRight',(660,835)),
    ])
    print(json.dumps(reports,indent=2))

if __name__=='__main__': main()
