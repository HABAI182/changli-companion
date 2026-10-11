"""Read-only pixel evidence from Core-rendered audit screenshots, not art editing."""
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
BUILD = HERE / 'build'
ROIS = {
    'upper_loop_outer_edge': (352, 163, 406, 234),
    'root_corner': (351, 242, 370, 261),
    'small_loop_outer_edge': (274, 270, 297, 300),
}

if __name__ == '__main__':
    rows = []
    for version in (39, 40, 41):
        image = Image.open(BUILD / f'contour-audit-v{version}-20261006/neutral-dark.png').convert('RGB')
        row = {'version': version, 'regions': {}}
        for name, box in ROIS.items():
            row['regions'][name] = {'box': box, 'brightPixelsMinRgbOver215': sum(min(p) > 215 for p in image.crop(box).getdata())}
        rows.append(row)
        image.crop((260, 145, 475, 350)).resize((645, 615)).save(BUILD / f'v{version}-gold-edge-review.png')
    report = {'scope': 'Small exterior-edge ROIs only; excludes any claim of complete layer cleanup. Crops are QA evidence, not replacement art.', 'formalArtComplete': False, 'rows': rows}
    (BUILD / 'gold-edge-pixel-review-20261006.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report))
