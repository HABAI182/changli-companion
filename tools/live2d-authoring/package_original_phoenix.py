"""Copy imagegen components unchanged to separate native PSD layers.

Only crop and layer placement are performed, with no painting/resampling.
The selected rectangles preserve the complete visible components; native size,
draw order, mesh and motion binding still require Editor calibration and QA.
"""
from package_hair_tail_layers import package

if __name__ == '__main__':
    print(package('ChangliOriginalPhoenix-v1.psd', [
        ('phoenix-original-tail-v1.png', 'SOURCE PhoenixTail Original', (1120,817)),
        ('phoenix-original-body-v1.png', 'SOURCE PhoenixBody Original', (1025,750)),
        ('phoenix-original-wing-v1.png', 'SOURCE PhoenixWing Original', (1125,910)),
    ]))
