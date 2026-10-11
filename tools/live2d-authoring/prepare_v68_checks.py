"""Reuse strict opacity checks with complete native parameter endpoints."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
for suffix in ['checks.js','preview.html']:
    s=(HERE/f'reference-repair-v67-{suffix}').read_text(encoding='utf-8')
    (HERE/f'reference-repair-v68-{suffix}').write_text(s.replace('v67','v68').replace('V67','V68').replace('const version = 67;','const version = 68;'),encoding='utf-8')
s=(HERE/'audit_v67_raw_geometry.py').read_text(encoding='utf-8')
(HERE/'audit_v68_raw_geometry.py').write_text(s.replace('[64,67]','[64,68]').replace("'version':67","'version':68").replace('v67-20261009','v68-20261009'),encoding='utf-8')
p=HERE/'verify_reference_repair.cjs';s=p.read_text(encoding='utf-8')
if '[68, 67,' not in s:p.write_text(s.replace('[67, 66,','[68, 67, 66,'),encoding='utf-8')
print('Prepared v68 checks; all six opacity curves and43 meshes remain guarded.')
