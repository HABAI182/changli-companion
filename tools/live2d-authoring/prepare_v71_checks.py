"""Strict v71 alpha-only review, compared to the saved v70 official export."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
for name in ['reference-repair-v70-preview.html','audit_v70_raw_geometry.py']:
    s=(HERE/name).read_text(encoding='utf-8').replace('v70','v71').replace('V70','V71').replace('const version = 70;','const version = 71;').replace('[64,70]','[70,71]').replace("'version':70","'version':71").replace("'baselineVersion':64","'baselineVersion':70")
    (HERE/name.replace('v70','v71')).write_text(s,encoding='utf-8')
s=(HERE/'reference-repair-v70-checks.js').read_text(encoding='utf-8').replace('v64','v70').replace('V64','V70').replace('baselineVersion:64','baselineVersion:70').replace('v70-20261011.json','v71-20261011.json')
s=s.replace("const blinkGeometry={EyeLeft2:'ParamEyeLOpen',ArtMesh26:'ParamEyeLOpen',ArtMesh24:'ParamEyeLOpen',EyeRight2:'ParamEyeROpen',ArtMesh25:'ParamEyeROpen',ArtMesh23:'ParamEyeROpen'};",'const blinkGeometry={};')
s=s.replace("const originalOpacity=o=>Math.max(0,Math.min(1,(o-.08)/(.35-.08)));","const originalOpacity=o=>Math.max(0,Math.min(1,o/.035));")
s=s.replace("const closedOpacity=o=>Math.max(0,Math.min(1,1-o/.12));","const closedOpacity=o=>1-originalOpacity(o);")
s=s.replace("opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));","const expectedOpacity=eyeParams[id]?(id==='ArtMesh42'||id==='ArtMesh43'?closedOpacity:originalOpacity)(params[eyeParams[id]]??1):baseline.drawables.opacities[j]; opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-expectedOpacity));")
s=s.replace('allowedOpacityChange:[]','allowedOpacityChange:Object.keys(eyeParams)').replace("expectedGeometry:'Only six eye children below open0.35 may move; open0.35/0.5/1 and other37 layers unchanged; opacity/topology/orders exact v64'","expectedGeometry:'All43 raw/world geometry, topology, UV, mask and orders preserve v70; only six eye alpha curves follow complementary open/0.035'")
s=s.replace('[0,.01,.08,.12,.2,.349,.35,.5,1]','[0,.005,.01,.015,.02,.025,.03,.035,.04,.08,.1,.12,.2,.349,.35,.5,1]')
(HERE/'reference-repair-v71-checks.js').write_text(s,encoding='utf-8')
for name,before,after in [('prepare_reference_repair_runtime.py','range(2, 71)','range(2, 72)'),('finish_native_export.py','(69,70)','(69,70,71)'),('verify_reference_repair.cjs','[70, 69,','[71, 70, 69,'),('input-blink-preview.html','[69,70]','[69,70,71]')]:
    p=HERE/name;t=p.read_text(encoding='utf-8');p.write_text(t.replace(before,after),encoding='utf-8')
s=(HERE/'verify_candidate_blink_v70.cjs').read_text(encoding='utf-8').replace('candidate=70','candidate=71').replace('candidateVersion=70','candidateVersion=71').replace('candidateVersion=70','candidateVersion=71').replace('v70','v71')
(HERE/'verify_candidate_blink_v71.cjs').write_text(s,encoding='utf-8')
print('Prepared v71 alpha-only guard; no native/runtime assets edited.')
