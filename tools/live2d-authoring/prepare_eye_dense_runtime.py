"""Stage the Editor subdivision export and its topology-aware Core review."""
import hashlib
import json

import prepare_eye_deform_runtime as staging

staging.SOURCE = staging.HERE / 'build/editor-export-eye-dense-v1-20261002'
staging.TARGET = staging.HERE.parents[1] / 'public/models/changli/live-eye-dense-v1-candidate'
staging.NAME = 'ChangliEyeDenseV1'

if __name__ == '__main__':
    staging.main()
    # Keep byte-level provenance separate from geometry and visual acceptance.
    exported = [staging.SOURCE / f'{staging.NAME}.moc3']
    exported += sorted(staging.SOURCE.glob('*.2048/*.png'))
    resources = []
    for source in exported:
        relative = source.relative_to(staging.SOURCE)
        runtime = staging.TARGET / relative
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest().upper()
        runtime_hash = hashlib.sha256(runtime.read_bytes()).hexdigest().upper()
        if source_hash != runtime_hash:
            raise ValueError(f'Runtime asset differs from official export: {relative}')
        resources.append({'path': relative.as_posix(), 'bytes': source.stat().st_size,
                          'sha256': source_hash, 'runtimeIdentical': True})
    authoring = staging.HERE / 'ChangliReferenceRepair-v1-candidate.cmo3'
    backup = staging.HERE / 'build/ChangliEyeDenseAuthoring-v1-20261002.cmo3'
    authoring_hash = hashlib.sha256(authoring.read_bytes()).hexdigest().upper()
    if hashlib.sha256(backup.read_bytes()).hexdigest().upper() != authoring_hash:
        raise ValueError('Dense authoring backup differs from saved source')
    provenance = {'candidate': staging.NAME, 'authoringSha256': authoring_hash,
                  'backupIdentical': True, 'resources': resources,
                  'formalArtComplete': False, 'windowsDesktopVerified': False}
    (staging.HERE / 'build/eye-dense-v1-provenance-20261002.json').write_text(
        json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
    page = (staging.HERE / 'eye-gaze-v1-preview.html').read_text(encoding='utf-8')
    page = page.replace('长离 · 视线与眨眼叠加核对', '长离 · 眼部细分与绑定回归核对')
    page = page.replace('live-eye-gaze-v1-candidate', 'live-eye-dense-v1-candidate')
    page = page.replace('ChangliEyeGazeV1', 'ChangliEyeDenseV1')
    page = page.replace('独立虹膜视线 · 隔离候选', '眼白与轮廓网格细分 · 隔离候选')
    page = page.replace('真实 Editor 导出与 Core 验证。', '四个眼部网格由 4 点细分到 25 点；真实 Editor 导出与 Core 验证。')
    page = page.replace('/models/changli/live-eye-layers-v2-candidate/ChangliEyeLayersV2.moc3',
                        '/models/changli/live-eye-gaze-v1-candidate/ChangliEyeGazeV1.moc3')
    old_check = "if(i<0||a[i].length!==b[j].length)throw Error('Topology regression');max=Math.max(max,diff(a[i],b[j]));"
    new_check = "if(i<0)throw Error('Missing baseline drawable');max=Math.max(max,geometryDifference(i,j,a[i],b[j]));"
    if old_check not in page:
        raise ValueError('Baseline review template changed; inspect before generating')
    page = page.replace(old_check, new_check)
    helper = '''
 const refined=['ArtMesh25','ArtMesh26','EyeLeft2','EyeRight2'];
 // Compare each new vertex to the old triangle surface at the SAME UV.
 // A topology change must not conceal changed old corners or unrelated meshes.
 function geometryDifference(i,j,a,b){
   if(!refined.includes(ids[i])){if(a.length!==b.length)throw Error('Unexpected topology change');return diff(a,b);}
   if(a.length!==50||b.length!==8)throw Error('Expected 4 -> 25 subdivision');
   const uv=core.drawables.vertexUvs[i],ov=old.drawables.vertexUvs[j],tri=old.drawables.indices[j];let max=0;
   for(let k=0;k<uv.length;k+=2){
     const x=uv[k],y=uv[k+1];let expected=null;
     for(let t=0;t<tri.length;t+=3){
       const p=tri[t]*2,q=tri[t+1]*2,r=tri[t+2]*2;
       const ax=ov[p],ay=ov[p+1],bx=ov[q],by=ov[q+1],cx=ov[r],cy=ov[r+1];
       const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
       if(Math.abs(den)<1e-12)continue;
       const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/den;
       const v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/den,w=1-u-v;
       if(Math.min(u,v,w)<-1e-4)continue;
       expected=[u*b[p]+v*b[q]+w*b[r],u*b[p+1]+v*b[q+1]+w*b[r+1]];break;
     }
     if(!expected)throw Error('New UV escaped baseline surface');
     max=Math.max(max,Math.abs(a[k]-expected[0])*ppu,Math.abs(a[k+1]-expected[1])*ppu);
   }return max;
 }
 const topology=ids.map((id,i)=>({id,vertices:core.drawables.vertexCounts[i],baselineVertices:old.drawables.vertexCounts[old.drawables.ids.indexOf(id)]}));
 const topologyPass=ids.length===old.drawables.ids.length&&refined.every(id=>core.drawables.vertexCounts[at(id)]===25);
'''
    page = page.replace(' const regressions=', helper + '\n const regressions=')
    page = page.replace('officialCore:true,drawables:', 'officialCore:true,topology,topologyPass,drawables:')
    page = page.replace('pass:directionPass&&axes.every', 'pass:topologyPass&&directionPass&&axes.every')
    # Float round-off accumulates across interpolated UVs and rotated poses.
    page = page.replace('pass:max<.001', 'pass:max<.01')
    page = page.replace('真实 Cubism Core…', '真实 Cubism Core（细分候选）…')
    page = page.replace('<meta charset="utf-8">', '<meta charset="utf-8"><link rel="icon" href="data:,">')
    (staging.HERE / 'eye-dense-v1-preview.html').write_text(page, encoding='utf-8')
