"""Read-only geometry audit of official exports; never patch model binaries."""
import hashlib,json
from pathlib import Path
from native_moc_sections import NativeSections
HERE=Path(__file__).resolve().parent
paths=[HERE/f'build/editor-export-reference-repair-v{v}-20261006/ChangliReferenceRepairV{v}.moc3' for v in [64,70]]
ss=[NativeSections(p).model.sections for p in paths]
allowed={'EyeLeft2','EyeRight2','ArtMesh25','ArtMesh26','ArtMesh42','ArtMesh43'}
rows=[]
for id in ss[0]['art_mesh_src.id']:
    values=[]
    for s in ss:
        i=s['art_mesh_src.id'].index(id);start=s['art_mesh_src.keyform_off'][i];n=s['art_mesh_src.key_len'][i];nv=s['art_mesh_src.vertex_count'][i]*2
        values.append([s['key_pos_src.xy'][o:o+nv] for o in s['art_mesh_key_src.key_pos_off'][start:start+n]])
    if id in allowed:
        delta=max(min(max(abs(a-b) for a,b in zip(old,new)) for old in values[0]) for new in values[1])*1254
    elif len(values[0])==len(values[1]):
        delta=max(max(abs(a-b) for a,b in zip(old,new)) for old,new in zip(*values))*1254
    else:delta=float('inf')
    rows.append({'id':id,'maxRawPixels':delta,'pass':delta<.001})
report={'version':70,'baselineVersion':64,'readOnly':True,'officialMocSha256':hashlib.sha256(paths[1].read_bytes()).hexdigest().upper(),'meshes':rows,'pass':len(rows)==43 and all(r['pass'] for r in rows),'scope':'All raw mesh keyform XY unchanged; invisible Core world vertices may retain cached poses.'}
(HERE/'build/raw-geometry-v70-20261011.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report));raise SystemExit(0 if report['pass'] else 1)
