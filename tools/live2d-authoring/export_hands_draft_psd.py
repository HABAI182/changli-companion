"""Package approved existing pixels into a separate, explicitly incomplete PSD.

No painting, raster modification, registration correction, or MOC3 generation.
The generated underpaint is a candidate; hands still need isolated layers.
"""
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent


def main():
    original = PSDImage.open(HERE / "ChangliCandidateLayers.psd")
    underpaint = Image.open(HERE / "assets/no-hands-underpaint-v1.png").convert("RGBA")
    if underpaint.size != original.size:
        raise ValueError("Underpaint must match the existing PSD canvas; do not rescale silently")
    if underpaint.getchannel("A").getextrema() != (0, 255):
        raise ValueError("Underpaint must contain real transparency")
    draft = PSDImage.new(mode="RGB", size=original.size, depth=8)
    draft.create_pixel_layer(underpaint, name="DRAFT Base - no hands - generated underpaint")
    for layer in original:
        if layer.name.startswith("00 Base"):
            continue
        draft.create_pixel_layer(layer.composite().convert("RGBA"), name=layer.name,
                                 top=layer.top, left=layer.left)
    output = HERE / "ChangliHandsDraft.psd"
    draft.save(output)
    reread = PSDImage.open(output)
    assert reread.size == original.size and len(reread) == 4
    assert [layer.name for layer in reread][1:] == [layer.name for layer in original][1:]
    print(f"Saved incomplete draft: {output}, {len(reread)} layers, hands missing")


if __name__ == "__main__":
    main()
