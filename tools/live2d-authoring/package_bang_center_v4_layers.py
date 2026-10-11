"""Package candidate bang and repaired underpaint without repainting/resampling."""
from package_hair_tail_layers import package

if __name__ == '__main__':
    print(package('ChangliBangCenterDraft-v4.psd', [
        ('bang-underpaint-v1-candidate.png', 'DRAFT BangUnderpaint', None),
        ('bang-center-v4-candidate.png', 'DRAFT BangCenterV4', None),
    ]))
