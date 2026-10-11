"""Package generated secondary layers without resampling or painting pixels."""
import json
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent

def main():
    psd = PSDImage.new(mode='RGB', size=(1254, 1254), depth=8)
    report = []
    for filename, name, placement in [
        ('secondary-underpaint-v2.png', 'DRAFT Secondary Underpaint', None),
        ('phoenix-v1.png', 'DRAFT Phoenix', (1010, 750)),
        ('ahoge-v1.png', 'DRAFT Ahoge', (650, 122)),
        ('ornament-right-v1.png', 'DRAFT OrnamentRight', (966, 455)),
    ]:
        pixels = Image.open(HERE / 'assets' / filename).convert('RGBA')
        assert pixels.size == (1254, 1254)
        bounds = pixels.getchannel('A').point(lambda a: 255 if a >= 8 else 0).getbbox()
        assert bounds
        left, top = placement or bounds[:2]
        layer = psd.create_pixel_layer(pixels.crop(bounds), name=name, left=left, top=top)
        report.append(dict(file=filename, name=name, sourceBounds=bounds,
                           psdBounds=layer.bbox, requiresNativeCalibration=True))
    destination = HERE / 'ChangliSecondaryAdditionsDraft.psd'
    psd.save(destination)
    check = PSDImage.open(destination)
    assert len(check) == 4 and check.size == (1254, 1254)
    (HERE / 'build' / 'secondary-layer-packaging.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
