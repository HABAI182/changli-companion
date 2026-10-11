"""Wrap candidate eye pixels in editable PSD layers; no painting or resampling.

The generator's framing is intentionally retained. Native Cubism calibration
must establish the final size, placement, clipping and parameter bindings.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent


def main():
    destination = HERE / 'ChangliEyeComponentsDraft-v1.psd'
    psd = PSDImage.new(mode='RGB', size=(1254, 1254), depth=8)
    report = []
    for filename, component in (
        ('eye-sclera-v1-candidate.png', 'Sclera'),
        ('eye-irises-v1-candidate.png', 'Iris'),
    ):
        path = HERE / 'assets' / filename
        image = Image.open(path).convert('RGBA')
        width, height = image.size
        assert (width, height) == (1254, 1254), image.size
        for side, region in (
            ('Left', (0, 0, width // 2, height)),
            ('Right', (width // 2, 0, width, height)),
        ):
            pixels = image.crop(region)
            # Use alpha only to find a tight layer boundary. Pixel values inside
            # it remain unchanged, including low-alpha edge pixels.
            local = pixels.getchannel('A').point(lambda a: 255 if a >= 8 else 0).getbbox()
            assert local, (filename, side)
            bounds = (local[0] + region[0], local[1], local[2] + region[0], local[3])
            layer = psd.create_pixel_layer(image.crop(bounds),
                name=f'DRAFT Eye{side}{component}', left=bounds[0], top=bounds[1])
            report.append(dict(file=filename, label=layer.name, sourceBounds=bounds,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                status='unregistered candidate; not a formal eye layer'))
    psd.save(destination)
    restored = PSDImage.open(destination)
    assert restored.size == psd.size and len(restored) == 4
    for expected, actual in zip(psd, restored):
        assert expected.bbox == actual.bbox
        assert expected.topil().tobytes() == actual.topil().tobytes()
    (HERE / 'build' / 'ChangliEyeComponentsDraft-v1-packaging.json').write_text(
        json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
