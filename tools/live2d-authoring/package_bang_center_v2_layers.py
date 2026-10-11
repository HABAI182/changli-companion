"""Pack a replaceable central bang candidate; no painting or resampling."""
from package_hair_tail_layers import package


if __name__ == '__main__':
    print(package('ChangliBangCenterDraft-v2.psd', [
        ('bang-center-v2-candidate.png', 'DRAFT BangCenterCandidate', None),
    ]))
