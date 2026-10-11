"""Package unaltered source pixels for native mesh editing; no repaint/resampling."""
import hashlib
import json
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage

HERE = Path(__file__).resolve().parent


def main():
    reference = HERE / 'references/changli-original-20261002.png'
    original = Image.open(reference).convert('RGBA')
    assert original.size == (1254, 1254)
    psd = PSDImage.new(mode='RGB', size=original.size, depth=8)
    # Full reference stays hidden: never render its background as a pet layer.
    ref = psd.create_pixel_layer(original, name='REFERENCE Original - hide before export')
    ref.visible = False
    # These rectangles retain the original pixels, including surrounding artwork.
    # Native mesh contours must exclude eyes/hair/clothes/background before use.
    rows = [('SOURCE LowerFace - native contour required', (300, 730, 875, 887)),
            ('SOURCE Mouth - native contour required', (558, 775, 598, 812)),
            ('SOURCE LeftHair - native contour required', (8, 568, 420, 930))]
    report = []
    for name, bounds in rows:
        layer = psd.create_pixel_layer(original.crop(bounds), name=name,
                                       left=bounds[0], top=bounds[1])
        layer.visible = False
        report.append({'label': name, 'bounds': bounds,
                       'status': 'unaltered rectangular source; not an isolated runtime layer'})
    destination = HERE / 'ChangliReferenceRepairSources-v1.psd'
    psd.save(destination)
    restored = PSDImage.open(destination)
    assert restored.size == psd.size and len(restored) == len(psd)
    for expected, actual in zip(psd, restored):
        assert expected.bbox == actual.bbox
        assert expected.visible == actual.visible
        assert expected.topil().tobytes() == actual.topil().tobytes()
    # Separate candidate PSD can be imported once or used to replace the old layer.
    candidate = Image.open(HERE / 'assets/hair-left-v2-candidate.png').convert('RGBA')
    assert candidate.size == (1254, 1254)
    bounds = candidate.getchannel('A').point(lambda a: 255 if a >= 8 else 0).getbbox()
    hair = PSDImage.new(mode='RGB', size=candidate.size, depth=8)
    layer = hair.create_pixel_layer(candidate.crop(bounds), name='DRAFT HairLeftV2',
                                    left=bounds[0], top=bounds[1])
    hair_path = HERE / 'ChangliLeftHairRepairDraft-v2.psd'
    hair.save(hair_path)
    restored_hair = PSDImage.open(hair_path)
    assert restored_hair[0].bbox == layer.bbox
    assert restored_hair[0].topil().tobytes() == layer.topil().tobytes()
    evidence = {'date': '2026-10-02', 'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
                'referenceSize': original.size, 'sourceRows': report,
                'sourcePixelsRoundTrip': True, 'sourceLayersHidden': True,
                'candidateBounds': bounds, 'candidateAlphaExtrema': candidate.getchannel('A').getextrema(),
                'candidatePixelsRoundTrip': True,
                'candidateSha256': hashlib.sha256((HERE / 'assets/hair-left-v2-candidate.png').read_bytes()).hexdigest(),
                'nativeImported': False, 'artApproved': False,
                'limitations': ['Generated hair placement and scale differ from original',
                                'Source rectangles require native mesh contour editing',
                                'No new official MOC3 or Windows acceptance']}
    (HERE / 'build/reference-repair-packaging-20261002.json').write_text(
        json.dumps(evidence, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(evidence, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
