"""Keep v69's strict guard: preserve half/open shapes with new native keys."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
for name in ['reference-repair-v69-checks.js','reference-repair-v69-preview.html','audit_v69_raw_geometry.py']:
    s=(HERE/name).read_text(encoding='utf-8')
    s=s.replace('v69','v70').replace('V69','V70').replace('const version = 69;','const version = 70;').replace('[64,69]','[64,70]').replace("'version':69","'version':70")
    (HERE/name.replace('v69','v70')).write_text(s,encoding='utf-8')
p=HERE/'verify_reference_repair.cjs';s=p.read_text(encoding='utf-8')
if '[70, 69,' not in s:p.write_text(s.replace('[69, 68,','[70, 69, 68,'),encoding='utf-8')
s=(HERE/'verify_candidate_blink.cjs').read_text(encoding='utf-8').replace('candidate=69','candidate=70').replace('candidateVersion=69','candidateVersion=70').replace('v69','v70')
(HERE/'verify_candidate_blink_v70.cjs').write_text(s,encoding='utf-8')
print('Preparedv70 native regression and isolated Adapter render; no production model change.')
