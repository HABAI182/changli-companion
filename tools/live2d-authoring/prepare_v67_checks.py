"""Build opacity-only checks; separately verify raw geometry of invisible meshes."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
s=(HERE/'reference-repair-v66-checks.js').read_text(encoding='utf-8')
s=s.replace(s.splitlines()[0],'// All43 raw mesh keyforms audited separately; world geometry compared whenever both versions render the mesh.')
s=s.replace('now[i].forEach((v,k)=>maxPixels=', 'if(core.drawables.opacities[i]>.00001&&baseline.drawables.opacities[j]>.00001)now[i].forEach((v,k)=>maxPixels=')
s=s.replace("report.pass=report.regressions.pass", "report.rawGeometry=await(await fetch('/tools/live2d-authoring/build/raw-geometry-v67-20261009.json')).json();report.pass=report.rawGeometry.pass&&report.regressions.pass")
(HERE/'reference-repair-v67-checks.js').write_text(s,encoding='utf-8')
h=(HERE/'reference-repair-v66-preview.html').read_text(encoding='utf-8').replace('v66','v67').replace('V66','V67').replace('const version = 66;','const version = 67;')
(HERE/'reference-repair-v67-preview.html').write_text(h,encoding='utf-8')
p=HERE/'verify_reference_repair.cjs';s=p.read_text(encoding='utf-8')
if '[67, 66,' not in s:p.write_text(s.replace('[66, 64,','[67, 66, 64,'),encoding='utf-8')
print('Prepared v67 strict opacity and visible world geometry checks.')
