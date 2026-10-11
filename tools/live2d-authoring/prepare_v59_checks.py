"""Create strict v59 QA: only Rotation6 endpoint angles may change."""
from pathlib import Path
HERE = Path(__file__).resolve().parent
p = HERE / 'reference-repair-v59-preview.html'
p.write_text((HERE/'reference-repair-v58-preview.html').read_text(encoding='utf-8').replace('v58','v59').replace('version = 58','version = 59'), encoding='utf-8')
s=(HERE/'reference-repair-v58-checks.js').read_text(encoding='utf-8')
s=s.replace('v56','v58').replace('V56','V58')
s=s.replace("const added=['ArtMesh55','ArtMesh56','ArtMesh57','ArtMesh58'];", "const added=[];\n const rotated=new Set(['ArtMesh27','ArtMesh31','ArtMesh55','ArtMesh57','ArtMesh58']);")
s=s.replace("const now=pose(model,params),old=pose(baselineModel,params);", "const now=pose(model,params),old=pose(baselineModel,params);\n const s=params.ParamSideHairLeftSway??0;\n const expected=pose(baselineModel,{...params,ParamSideHairLeftSway:s*(s<0?1.5/9:1.5/8.4)});")
s=s.replace('v-old[j][k]', 'v-(rotated.has(id)?expected[j][k]:old[j][k])')
s=s.replace('baselineVersion:56,preservedMeshes:oldIds.length', 'baselineVersion:58,preservedMeshes:oldIds.length-rotated.size,rotationEndpointDegrees:[-1.5,0,1.5],rotationChildren:[...rotated],expectedGeometry:"v58 geometry at equivalent interpolated Rotation6 angle",checkedMeshes:oldIds.length')
s=s.replace('oldIds.length+4','oldIds.length')
s=s.replace('// Preserve all verified v58 meshes; allow only native tail and keyboard additions.', '// Preserve all 43 v58 meshes; require exact equivalent -1.5/0/+1.5 degree geometry for only Rotation6 children.')
(HERE/'reference-repair-v59-checks.js').write_text(s,encoding='utf-8')
p=HERE/'verify_reference_repair.cjs';s=p.read_text(encoding='utf-8').replace('const version = [58,','const version = [59, 58,');p.write_text(s,encoding='utf-8')
print('v59 strict scaled-angle regression checks prepared')
