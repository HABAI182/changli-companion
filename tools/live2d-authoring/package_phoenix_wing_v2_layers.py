"""Package revised provisional phoenix wing pixels for native Cubism re-import."""
from package_hair_tail_layers import package


def main():
    print(package('ChangliPhoenixWingDraft-v2.psd', [
        ('phoenix-body-no-wing-v1-candidate.png', 'DRAFT PhoenixBodyNoWing', (1010, 750)),
        ('phoenix-wing-v2-candidate.png', 'DRAFT PhoenixWing', (1040, 930)),
    ]))


if __name__ == '__main__':
    main()
