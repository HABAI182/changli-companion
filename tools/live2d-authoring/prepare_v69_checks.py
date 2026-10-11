"""Generate strict regression checks for native closed-endpoint alignment."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
s = (HERE / 'reference-repair-v68-checks.js').read_text(encoding='utf-8')
s = s.replace('const rotated=new Set();', "const blinkGeometry={EyeLeft2:'ParamEyeLOpen',ArtMesh26:'ParamEyeLOpen',ArtMesh24:'ParamEyeLOpen',EyeRight2:'ParamEyeROpen',ArtMesh25:'ParamEyeROpen',ArtMesh23:'ParamEyeROpen'};")
s = s.replace('let maxPixels=0,opacityMax=0', 'let plannedBlinkPixels=0,maxPixels=0,opacityMax=0')
start = s.index('if(core.drawables.opacities[i]>.00001&&baseline.drawables.opacities[j]>.00001)now[i].forEach')
end = s.index('if(core.drawables.drawOrders[i]', start)
s = s[:start] + '''if(core.drawables.opacities[i]>.00001&&baseline.drawables.opacities[j]>.00001)now[i].forEach((v,k)=>{
 const delta=Math.abs(v-old[j][k])*ppu;
 if(blinkGeometry[id]&&(params[blinkGeometry[id]]??1)<.35)plannedBlinkPixels=Math.max(plannedBlinkPixels,delta);
 else maxPixels=Math.max(maxPixels,delta);
 });opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));''' + s[end:]
s = s.replace('return {params,maxPixels,opacityMax', 'return {params,maxPixels,plannedBlinkPixels,opacityMax')
s = s.replace('preservedMeshes:oldIds.length-rotated.size,allowedOpacityChange:Object.keys(eyeParams)', 'preservedMeshes:oldIds.length-Object.keys(blinkGeometry).length,allowedGeometryChange:blinkGeometry,allowedOpacityChange:[]')
s = s.replace('All43 v64 vertices unchanged; six exact expected blink opacity curves; all topology/orders exact', 'Only six eye children below open0.35 may move; open0.35/0.5/1 and other37 layers unchanged; opacity/topology/orders exact v64')
s = s.replace("const neutral=pose(model);", "for(const a of [0,.01,.08,.12,.2,.349,.35,.5,1])for(const b of [0,.1,.35,.5,1])states.push({ParamEyeLOpen:a,ParamEyeROpen:b});\n const neutral=pose(model);")
s = s.replace('raw-geometry-v68-20261009.json', 'raw-geometry-v69-20261011.json')
s = s.replace('pass:a*c<.02&&Math.abs(a-b)<.0001', 'sum:a+c,pass:Math.abs(a+c-1)<.0001&&Math.abs(a-b)<.0001')
s = s.replace('maxOverlap:Math.max(...overlap.map(x=>x.overlap)),', 'maxOverlap:Math.max(...overlap.map(x=>x.overlap)),maxSumError:Math.max(...overlap.map(x=>Math.abs(x.sum-1))),')
s = s.replace('Opacity overlap metric; visual animation acceptance is separate', 'Complementary original/closed alpha remains1; visual contour acceptance is separate')
(HERE / 'reference-repair-v69-checks.js').write_text(s, encoding='utf-8')
h = (HERE / 'reference-repair-v68-preview.html').read_text(encoding='utf-8').replace('v68', 'v69').replace('V68', 'V69').replace('const version = 68;', 'const version = 69;')
(HERE / 'reference-repair-v69-preview.html').write_text(h, encoding='utf-8')
a = (HERE / 'audit_v68_raw_geometry.py').read_text(encoding='utf-8').replace('[64,68]', '[64,69]').replace("'version':68", "'version':69").replace('v68-20261009', 'v69-20261011')
(HERE / 'audit_v69_raw_geometry.py').write_text(a, encoding='utf-8')
b = (HERE / 'verify_input_blink.cjs').read_text(encoding='utf-8')
b = b.replace("'/tools/live2d-authoring/input-blink-preview.html'", "'/tools/live2d-authoring/input-blink-preview.html?candidate=69'")
b = b.replace('build/input-blink-20261008', 'build/input-blink-v69-20261011')
b = b.replace("blinkVisualAcceptance=false;", "blinkVisualAcceptance=false;report.candidateVersion=69;report.modelEntry=await page.evaluate(()=>window.inputBlinkQa.modelEntry);if(!report.modelEntry.includes('v69-candidate/'))throw Error('Wrong candidate rendered');")
b = b.replace('scoped native v64 half/closed contour review', 'candidatev69 official Core review')
(HERE / 'verify_candidate_blink.cjs').write_text(b, encoding='utf-8')
p = HERE / 'verify_reference_repair.cjs'
v = p.read_text(encoding='utf-8')
if '[69, 68,' not in v:
    assert '[68, 67,' in v
    p.write_text(v.replace('[68, 67,', '[69, 68, 67,'), encoding='utf-8')
print('Prepared v69 regression; only low-opening native eye deformer geometry may change.')
