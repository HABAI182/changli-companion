"""Prepare strict order-only v60 regression against the released v59."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
s=(HERE/'reference-repair-v59-preview.html').read_text(encoding='utf-8').replace('v59','v60').replace('version = 59','version = 60')
(HERE/'reference-repair-v60-preview.html').write_text(s,encoding='utf-8')
s=(HERE/'reference-repair-v59-checks.js').read_text(encoding='utf-8').replace('v58','v59').replace('V58','V59')
s=s.replace("new Set(['ArtMesh27','ArtMesh31','ArtMesh55','ArtMesh57','ArtMesh58'])",'new Set()')
s=s.replace('if(core.drawables.drawOrders[i]!==baseline.drawables.drawOrders[j])wrongOrder++;',"if(core.drawables.drawOrders[i]!==(id==='ArtMesh33'?385:baseline.drawables.drawOrders[j]))wrongOrder++;")
s=s.replace('baselineVersion:58','baselineVersion:59').replace('rotationEndpointDegrees:[-1.5,0,1.5],rotationChildren:[...rotated],expectedGeometry:"v59 geometry at equivalent interpolated Rotation6 angle",','allowedDrawOrderChange:{ArtMesh33:385},expectedGeometry:"All v59 vertices unchanged",')
s=s.replace('report.formalArtComplete=false;',"report.nativeEarOcclusion={id:'ArtMesh33',drawOrder:core.drawables.drawOrders[ids.indexOf('ArtMesh33')],geometryPreserved:true,pass:core.drawables.drawOrders[ids.indexOf('ArtMesh33')]===385};\n report.pass&&=report.nativeEarOcclusion.pass;report.formalArtComplete=false;")
s=s.replace('// Preserve all 43 v59 meshes; require exact equivalent -1.5/0/+1.5 degree geometry for only Rotation6 children.', '// Preserve all 43 v59 geometries, UVs and masks; only ArtMesh33 draw order changes.')
s=s.replace(' const s=params.ParamSideHairLeftSway??0;\n const expected=pose(baselineModel,{...params,ParamSideHairLeftSway:s*(s<0?1.5/9:1.5/8.4)});', ' ')
s=s.replace('v-(rotated.has(id)?expected[j][k]:old[j][k])', 'v-old[j][k]')
(HERE/'reference-repair-v60-checks.js').write_text(s,encoding='utf-8')
p=HERE/'verify_reference_repair.cjs';s=p.read_text(encoding='utf-8').replace('const version = [59,','const version = [60, 59,');p.write_text(s,encoding='utf-8')
p=HERE/'prepare_reference_repair_runtime.py';s=p.read_text(encoding='utf-8').replace('range(2, 60)','range(2, 61)').replace('range(2,60)','range(2,61)');p.write_text(s,encoding='utf-8')
print('Prepared all-geometry-preserved v60 checks; only ArtMesh33 order385 allowed.')
