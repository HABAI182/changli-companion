"""Package generated pixels as additive PSD layers for native Editor calibration.

Does not resample or repaint. Position offsets are PSD metadata; generated
hand sizes still require calibration in Cubism. Leaves verified source intact.
"""
from pathlib import Path
import json
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent


def main():
    psd = PSDImage.new(mode="RGB", size=(1254, 1254), depth=8)
    report = []
    layers = [
        ("no-hands-underpaint-v1.png", "DRAFT Underpaint - no hands", None),
        ("hand-left-v1.png", "DRAFT HandLeft", (190, 800)),
        ("hand-right-v2.png", "DRAFT HandRight", (660, 835)),
    ]
    for filename, name, placement in layers:
        pixels = Image.open(HERE / "assets" / filename).convert("RGBA")
        assert pixels.size == (1254, 1254)
        alpha = pixels.getchannel("A")
        # Use the significant-alpha bounds to exclude remote nearly invisible
        # generation noise from the PSD rectangle; pixels inside stay intact.
        bounds = alpha.point(lambda a: 255 if a >= 8 else 0).getbbox()
        assert bounds is not None
        left, top = placement or bounds[:2]
        layer = psd.create_pixel_layer(pixels.crop(bounds), name=name, left=left, top=top)
        report.append({"file": filename, "name": name, "sourceBounds": bounds,
                       "psdBounds": layer.bbox, "requiresNativeCalibration": True})
    destination = HERE / "ChangliHandAdditionsDraft.psd"
    psd.save(destination)
    reread = PSDImage.open(destination)
    assert len(reread) == 3 and reread.size == (1254, 1254)
    (HERE / "build" / "hand-layer-packaging.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {destination}; three additive draft layers, calibration pending")


if __name__ == "__main__":
    main()
