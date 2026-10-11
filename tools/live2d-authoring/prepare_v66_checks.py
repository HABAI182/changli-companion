"""Strict v66 opacity-only regression against the fully verified native v64."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
s=(HERE/'reference-repair-v62-checks.js').read_text(encoding='utf-8')
s=s.replace('v60','v64').replace('V60','V64').replace('baselineVersion:60','baselineVersion:64')
s=s.replace("const rotated=new Set(['EyeRight2']);", "const rotated=new Set();\n const eyeParams={EyeLeft2:'ParamEyeLOpen',ArtMesh26:'ParamEyeLOpen',ArtMesh42:'ParamEyeLOpen',EyeRight2:'ParamEyeROpen',ArtMesh25:'ParamEyeROpen',ArtMesh43:'ParamEyeROpen'};\n const originalOpacity=o=>Math.max(0,Math.min(1,(o-.08)/(.35-.08)));\n const closedOpacity=o=>Math.max(0,Math.min(1,1-o/.12));")
s=s.replace("(id==='EyeRight2'&&(params.ParamEyeROpen??1)<1?0:Math.abs(v-old[j][k])*ppu)", "Math.abs(v-old[j][k])*ppu")
s=s.replace('Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j])', "Math.abs(core.drawables.opacities[i]-(eyeParams[id]?(id==='ArtMesh42'||id==='ArtMesh43'?closedOpacity(params[eyeParams[id]]??1):originalOpacity(params[eyeParams[id]]??1)):baseline.drawables.opacities[j]))")
start=s.index('allowedGeometryChange:')
end=s.index(',checkedMeshes:',start)
s=s[:start]+"allowedOpacityChange:Object.keys(eyeParams),expectedGeometry:'All43 v64 vertices unchanged; six exact expected blink opacity curves; all topology/orders exact'"+s[end:]
insert="""
 const overlap=[];
 for(let n=0;n<=1000;n++){const opening=n/1000;pose(model,{ParamEyeLOpen:opening,ParamEyeROpen:opening});
  for(const [eye,sclera,closed]of [['EyeLeft2','ArtMesh26','ArtMesh42'],['EyeRight2','ArtMesh25','ArtMesh43']]){
   const a=core.drawables.opacities[ids.indexOf(eye)],b=core.drawables.opacities[ids.indexOf(sclera)],c=core.drawables.opacities[ids.indexOf(closed)];
   overlap.push({opening,eye,overlap:a*c,maskDelta:Math.abs(a-b),pass:a*c<.02&&Math.abs(a-b)<.0001});
  }}
 report.blinkOpacityTransition={samples:overlap.length,maxOverlap:Math.max(...overlap.map(x=>x.overlap)),maxMaskDelta:Math.max(...overlap.map(x=>x.maskDelta)),pass:overlap.every(x=>x.pass),scope:'Opacity overlap metric; visual animation acceptance is separate'};
 report.pass&&=report.blinkOpacityTransition.pass;
"""
s=s.replace('report.formalArtComplete=false;',insert+'report.formalArtComplete=false;')
(HERE/'reference-repair-v66-checks.js').write_text(s,encoding='utf-8')
h=(HERE/'reference-repair-v64-preview.html').read_text(encoding='utf-8')
(HERE/'reference-repair-v66-preview.html').write_text(h.replace('v64','v66').replace('V64','V66').replace('const version = 64;','const version = 66;'),encoding='utf-8')
p=HERE/'verify_reference_repair.cjs';s=p.read_text(encoding='utf-8')
if '[66, 64,' not in s:
    assert '[64, 63,' in s
    p.write_text(s.replace('[64, 63,','[66, 64, 63,'),encoding='utf-8')
print('Prepared v66:43 unchanged meshes and six prescribed opacity curves;2002 overlap checks.')
