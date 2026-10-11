"""Prepare a scoped regression for the native right-eye closure rebuild."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
s = (HERE / 'reference-repair-v62-checks.js').read_text(encoding='utf-8')
s = s.replace("new Set(['EyeRight2'])", "new Set(['EyeRight2','ArtMesh25'])")
s = s.replace('nonFinite=0;', 'nonFinite=0,rightEyeParentPixels=0,plannedBlinkPixels=0;')
old = "now[i].forEach((v,k)=>maxPixels=Math.max(maxPixels,(id==='EyeRight2'&&(params.ParamEyeROpen??1)<1?0:Math.abs(v-old[j][k])*ppu)));"
new = """now[i].forEach((v,k)=>{const delta=Math.abs(v-old[j][k])*ppu;
 if(rotated.has(id)&&(params.ParamEyeROpen??1)<1)plannedBlinkPixels=Math.max(plannedBlinkPixels,delta);
 else if(id==='EyeRight2'&&(params.ParamAngleX||params.ParamAngleY))rightEyeParentPixels=Math.max(rightEyeParentPixels,delta);
 else maxPixels=Math.max(maxPixels,delta);});"""
assert old in s
s = s.replace(old, new)
s = s.replace('return {params,maxPixels,opacityMax,', 'return {params,maxPixels,rightEyeParentPixels,plannedBlinkPixels,opacityMax,')
s = s.replace('pass:maxPixels<.03&&', 'pass:maxPixels<.03&&rightEyeParentPixels<.5&&')
s = s.replace("allowedGeometryChange:{EyeRight2:'Native Warp5 blink inheritance; open1 unchanged'},expectedGeometry:'Other42 meshes exact; all topology/opacities/orders exact'", "allowedGeometryChange:{EyeRight2:'Native Warp5 blink inheritance; neutral open1 unchanged; X/Y extreme reparent interpolation limited to0.5px',ArtMesh25:'Native Warp5 positive closure rebuild; open1 unchanged'},expectedGeometry:'Other41 meshes exact; neutral43 exact; all topology/opacities/orders exact'")
s = s.replace('// Preserve42 mesh geometries and all43 UVs/masks/orders/opacities; only EyeRight2 closed geometry may change.', '// Native right closure: only EyeRight2 and ArtMesh25 blink geometry may change. All visible triangles must remain valid.')
(HERE / 'reference-repair-v63-checks.js').write_text(s, encoding='utf-8')
h = (HERE / 'reference-repair-v62-preview.html').read_text(encoding='utf-8')
(HERE / 'reference-repair-v63-preview.html').write_text(h.replace('v62', 'v63').replace('V62', 'V63').replace('const version = 62;', 'const version = 63;'), encoding='utf-8')
print('Prepared v63 checks:41 exact meshes, neutral43 exact, all43 topology/opacity/order exact; zero flips required.')
