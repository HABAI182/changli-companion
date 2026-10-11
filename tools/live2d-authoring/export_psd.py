"""Convert the provisional Changli layers into an editable Cubism-import PSD.

The script only packages the existing artwork and masks. It does not invent
hidden hand, hair, or phoenix artwork; those still require artistic repair.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))

from build_candidate import CANVAS, EYES, MOUTH, polygon_mask  # noqa: E402


def masked_layer(source: Image.Image, mask: Image.Image) -> Image.Image:
    layer = source.copy()
    layer.putalpha(ImageChops.multiply(source.getchannel("A"), mask))
    return layer


def main() -> None:
    try:
        from psd_tools import PSDImage
    except ImportError as error:
        raise SystemExit("Install psd-tools>=1.12 in the authoring Python environment") from error

    source = Image.open(ROOT / "public/models/changli/assets/changli-cutout.png").convert("RGBA")
    closed_plate = Image.open(HERE / "build/closed-plate.png").convert("RGBA")
    expected = Image.open(HERE / "build/rest-composite.png").convert("RGBA")
    assert source.size == closed_plate.size == expected.size == (CANVAS, CANVAS)

    psd = PSDImage.new(mode="RGB", size=(CANVAS, CANVAS), depth=8)

    def add_tight_layer(image: Image.Image, name: str) -> None:
        bounds = image.getbbox()
        if bounds is None:
            raise ValueError(f"Empty image layer: {name}")
        left, top, right, bottom = bounds
        psd.create_pixel_layer(image.crop(bounds), name=name, top=top, left=left)

    # Crop transparent margins so Cubism can pack the art at native resolution.
    add_tight_layer(closed_plate, "00 Base - closed eye underpaint")
    for name, polygon in EYES:
        add_tight_layer(masked_layer(source, polygon_mask(polygon)), name)
    mouth_mask = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(mouth_mask).ellipse(MOUTH, fill=255)
    add_tight_layer(masked_layer(source, mouth_mask), name="Mouth")

    output = HERE / "ChangliCandidateLayers.psd"
    psd.save(output)
    reread = PSDImage.open(output)
    if len(reread) != 4:
        raise RuntimeError(f"Expected 4 PSD layers, got {len(reread)}")
    # PSDImage.composite() uses the opaque document preview; compare the
    # imported layers over a transparent canvas instead.
    composite = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    for layer in reread:
        composite.alpha_composite(layer.composite().convert("RGBA"), dest=(layer.left, layer.top))
    diff = ImageChops.difference(composite, expected)
    maxima = [channel[1] for channel in diff.getextrema()]
    if any(value > 8 for value in maxima[:3]) or maxima[3] > 1:
        diagnostics = HERE / "build"
        composite.save(diagnostics / "psd-composite.png")
        diff.save(diagnostics / "psd-difference.png")
        raise RuntimeError(f"PSD differs from preview by {maxima}; inspect build/psd-difference.png")
    print(f"PSD round-trip RGBA channel differences: {maxima}")
    print(f"Wrote {output} with {len(reread)} editable layers")


if __name__ == "__main__":
    main()
