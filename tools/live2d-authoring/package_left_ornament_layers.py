"""Wrap candidate pixels for native replacement/calibration; no painting/resampling."""
from package_hair_tail_layers import package

if __name__ == '__main__':
    print(package('ChangliBangCenterLeftRepairDraft.psd', [
        ('bang-underpaint-no-left-v2-candidate.png', 'DRAFT BangUnderpaint', None),
        ('bang-center-v4-candidate.png', 'DRAFT BangCenterV4', None),
    ]))
    print(package('ChangliLeftOrnamentDraft.psd', [
        ('ornament-left-v1-candidate.png', 'DRAFT OrnamentLeft', None),
    ]))
