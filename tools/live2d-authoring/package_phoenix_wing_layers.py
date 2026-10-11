"""Package provisional phoenix wing art for native Cubism calibration.

The source images are AI candidates. This script only preserves their pixels in
separate PSD layers; neither alignment nor visual acceptance is implied.
"""

from package_hair_tail_layers import package


def main():
    report = package('ChangliPhoenixWingDraft.psd', [
        ('phoenix-body-no-wing-v1-candidate.png', 'DRAFT PhoenixBodyNoWing', (1010, 750)),
        ('phoenix-wing-v1-candidate.png', 'DRAFT PhoenixWing', (1040, 930)),
    ])
    print(report)


if __name__ == '__main__':
    main()
