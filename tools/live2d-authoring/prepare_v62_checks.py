"""Strict native blink-parent regression; never change model binary/texture."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
s = (HERE / 'reference-repair-v60-checks.js').read_text(encoding='utf-8')
s = s.replace('v59', 'v60').replace('V59', 'V60').replace('baselineVersion:59', 'baselineVersion:60')
s = s.replace('const rotated=new Set();', "const rotated=new Set(['EyeRight2']);")
s = s.replace("Math.abs(v-old[j][k])*ppu", "(id==='EyeRight2'&&(params.ParamEyeROpen??1)<1?0:Math.abs(v-old[j][k])*ppu)")
s = s.replace("(id==='ArtMesh33'?385:baseline.drawables.drawOrders[j])", "baseline.drawables.drawOrders[j]")
s = s.replace("allowedDrawOrderChange:{ArtMesh33:385},expectedGeometry:\"All v60 vertices unchanged\"", "allowedGeometryChange:{EyeRight2:'Native Warp5 blink inheritance; open1 unchanged'},expectedGeometry:'Other42 meshes exact; all topology/opacities/orders exact'")
# Preserve the failed result if a mesh other than the right contour changes.
# All triangles, including that contour, remain checked for flips/degeneracy.
s = s.replace('// Preserve all 43 v60 geometries, UVs and masks; only ArtMesh33 draw order changes.',
              '// Preserve42 mesh geometries and all43 UVs/masks/orders/opacities; only EyeRight2 closed geometry may change.')
(HERE / 'reference-repair-v62-checks.js').write_text(s, encoding='utf-8')
print('Strict v62 blink-parent checks prepared against published v60.')
