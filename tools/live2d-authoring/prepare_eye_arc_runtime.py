"""Stage official eye-arc trials; keep the default pet unchanged."""
import hashlib
import argparse
import json
import shutil

import prepare_eye_deform_runtime as staging

staging.SOURCE = staging.HERE / 'build/editor-export-eye-arc-v1-restored-20261002'
staging.TARGET = staging.HERE.parents[1] / 'public/models/changli/live-eye-arc-v1-candidate'
staging.NAME = 'ChangliEyeArcV1'

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', type=int, choices=(1, 2), default=1)
    version = parser.parse_args().version
    if version == 2:
        staging.SOURCE = staging.HERE / 'build/editor-export-eye-arc-v2-20261002'
        staging.TARGET = staging.HERE.parents[1] / 'public/models/changli/live-eye-arc-v2-candidate'
        staging.NAME = 'ChangliEyeArcV2'
    staging.main()
    source = staging.HERE / f'ChangliEyeArcAuthoring-v{version}-candidate.cmo3'
    backup = staging.HERE / f'build/ChangliEyeArcAuthoring-v{version}-20261002.cmo3'
    shutil.copy2(source, backup)
    resources = []
    for p in [staging.SOURCE / f'{staging.NAME}.moc3', *sorted(staging.SOURCE.glob('*.2048/*.png'))]:
        relative = p.relative_to(staging.SOURCE)
        digest = hashlib.sha256(p.read_bytes()).hexdigest().upper()
        if digest != hashlib.sha256((staging.TARGET / relative).read_bytes()).hexdigest().upper():
            raise ValueError(f'Runtime differs from official export: {relative}')
        resources.append({'path': relative.as_posix(), 'bytes': p.stat().st_size,
                          'sha256': digest, 'runtimeIdentical': True})
    provenance = {'candidate': staging.NAME,
                  'authoringSha256': hashlib.sha256(source.read_bytes()).hexdigest().upper(),
                  'backupIdentical': source.read_bytes() == backup.read_bytes(),
                  'resources': resources, 'formalArtComplete': False,
                  'windowsDesktopVerified': False}
    (staging.HERE / f'build/eye-arc-v{version}-provenance-20261002.json').write_text(
        json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
    page = (staging.HERE / 'eye-dense-v1-preview.html').read_text(encoding='utf-8')
    page = page.replace('live-eye-dense-v1-candidate', 'live-eye-arc-v1-candidate')
    page = page.replace('ChangliEyeDenseV1', 'ChangliEyeArcV1')
    page = page.replace('/models/changli/live-eye-gaze-v1-candidate/ChangliEyeGazeV1.moc3',
                        '/models/changli/live-eye-dense-v1-candidate/ChangliEyeDenseV1.moc3')
    page = page.replace('长离 · 眼部细分与绑定回归核对', '长离 · 左闭眼浅弧核对')
    page = page.replace('眼白与轮廓网格细分 · 隔离候选', '左闭眼浅弧 · 隔离试作')
    page = page.replace('四个眼部网格由 4 点细分到 25 点；真实 Editor 导出与 Core 验证。闭眼弧线、补绘融合仍是草稿，尚未进入默认或 Windows 包。',
                        '左眼闭合曲面浅弧试作；右眼保留细分基线。位置、补绘和正式眼睑仍需精修，尚未进入默认或 Windows 包。')
    start = page.index(" const refined=")
    end = page.index(" const blinkCombinations=", start)
    checks = '''
 const leftChanged=['ArtMesh26','EyeLeft2'];
 const topology=ids.map((id,i)=>({id,vertices:core.drawables.vertexCounts[i],baselineVertices:old.drawables.vertexCounts[old.drawables.ids.indexOf(id)]}));
 const topologyPass=ids.length===old.drawables.ids.length&&topology.every(v=>v.vertices===v.baselineVertices)&&ids.every((id,i)=>{
   const j=old.drawables.ids.indexOf(id);return JSON.stringify([...core.drawables.indices[i]])===JSON.stringify([...old.drawables.indices[j]])&&diff(core.drawables.vertexUvs[i],old.drawables.vertexUvs[j])<.001;
 });
 const poses=[{}, {ParamAngleZ:-30}, {ParamEyeLOpen:0,ParamEyeROpen:1}, {ParamEyeLOpen:.5,ParamEyeROpen:.5},
 {ParamEyeLOpen:0,ParamEyeROpen:0,ParamAngleZ:30,ParamBangCenterSway:1,ParamSideHairLeftSway:-1,ParamSideHairRightSway:1,ParamOrnamentLeftSway:1,ParamHandLeftPress:30,ParamHandRightPress:30,ParamPhoenixSway:30,ParamPhoenixWingSway:30,ParamPhoenixTailSway:30}];
 const regressions=poses.map(params=>{
   const a=set(core,params),b=set(old,params),changed=ids.filter((id,i)=>diff(a[i],b[old.drawables.ids.indexOf(id)])>.001);
   const expectsChange=(params.ParamEyeLOpen??1)<1;
   let unrelatedMax=0;for(let i=0;i<ids.length;i++)if(!leftChanged.includes(ids[i]))unrelatedMax=Math.max(unrelatedMax,diff(a[i],b[old.drawables.ids.indexOf(ids[i])]));
   return {params,changed,unrelatedMaxPixels:unrelatedMax,pass:unrelatedMax<.001&&(expectsChange?changed.length===2&&changed.every(id=>leftChanged.includes(id)):changed.length===0)};
 });
 const closed=set(core,{ParamEyeLOpen:0}),closedOld=set(old,{ParamEyeLOpen:0}),opened=set(core);
 const arcs=leftChanged.map(id=>{
   const i=at(id),j=old.drawables.ids.indexOf(id),uv=core.drawables.vertexUvs[i],p=closed[i],q=closedOld[j];
   const groups=new Map();for(let k=0;k<uv.length;k+=2){const key=uv[k+1].toFixed(5);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(k);}
   const rows=[...groups.values()].map(row=>{row.sort((a,b)=>uv[a]-uv[b]);if(row.length!==5)throw Error('Expected five vertices per eye row');
     const a=row[0],m=row[2],b=row[4];return {centerDepthPixels:((p[a+1]+p[b+1])/2-p[m+1])*ppu,
       baselineDepthPixels:((q[a+1]+q[b+1])/2-q[m+1])*ppu,
       endpointMaxPixels:Math.max(Math.abs(p[a]-q[a]),Math.abs(p[a+1]-q[a+1]),Math.abs(p[b]-q[b]),Math.abs(p[b+1]-q[b+1]))*ppu};});
   // Mesh rectangles sit inside the warp: their edges are NOT pinned eye corners.
   // Keep width and row thickness, and bound the shallow vertical displacement.
   let widthResidual=0,thicknessResidual=0,maxDisplacement=0;
   const ordered=[...groups.values()].sort((a,b)=>uv[a[0]+1]-uv[b[0]+1]);
   for(let row=0;row<ordered.length;row++)for(let col=0;col<5;col++){
     const k=ordered[row][col],first=ordered[0][col];
     widthResidual=Math.max(widthResidual,Math.abs(p[k]-q[k])*ppu);
     thicknessResidual=Math.max(thicknessResidual,Math.abs((p[k+1]-p[first+1])-(q[k+1]-q[first+1]))*ppu);
     maxDisplacement=Math.max(maxDisplacement,Math.abs(p[k+1]-q[k+1])*ppu);
   }
   return {id,rows,widthResidualPixels:widthResidual,thicknessResidualPixels:thicknessResidual,maxDisplacementPixels:maxDisplacement,
     pass:rows.length===5&&rows.every(r=>r.centerDepthPixels>4&&r.centerDepthPixels<12)&&widthResidual<.001&&thicknessResidual<.001&&maxDisplacement<15};
 });
 function area(p,a,b,c){a*=2;b*=2;c*=2;return (p[b]-p[a])*(p[c+1]-p[a+1])-(p[b+1]-p[a+1])*(p[c]-p[a]);}
 const interpolation=[0,.125,.25,.375,.5,.625,.75,.875,1].map(open=>{
   const pos=set(core,{ParamEyeLOpen:open}),oldPos=set(old,{ParamEyeLOpen:open});let max=0,flips=0,degenerate=0;
   for(const id of leftChanged){const i=at(id),j=old.drawables.ids.indexOf(id);for(let k=0;k<pos[i].length;k++)max=Math.max(max,Math.abs(pos[i][k]-opened[i][k]*open-closed[i][k]*(1-open))*ppu);
     const tri=core.drawables.indices[i];for(let t=0;t<tri.length;t+=3){const a=area(pos[i],tri[t],tri[t+1],tri[t+2]),b=area(oldPos[j],tri[t],tri[t+1],tri[t+2]);if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}}
   return {open,linearResidualPixels:max,flips,degenerate,pass:max<.001&&flips===0&&degenerate===0};
 });
 const arcPass=arcs.every(a=>a.pass)&&interpolation.every(a=>a.pass);
'''
    page = page[:start] + checks + page[end:]
    page = page.replace('officialCore:true,topology,', 'officialCore:true,arcs,interpolation,arcPass,topology,')
    page = page.replace('pass:topologyPass&&directionPass', 'pass:arcPass&&topologyPass&&directionPass')
    page = page.replace("'Original blink contour remains too flat'", "'Right closed-eye curve still unrefined; left arc is a trial'")
    page = page.replace('双轴视线、斜向叠加、眨眼隔离与已有形态回归。', '左眼浅弧、无翻折插值、原绑定与视线回归。')
    page = page.replace('<button id="animate">', '<button id="half">半闭</button><button id="closed">闭眼</button><button id="animate">')
    page = page.replace('diagonal:[1,1,.5]}', 'diagonal:[1,1,.5],half:[0,0,.5],closed:[0,0,0]}')
    if version == 2:
        page = page.replace('live-eye-arc-v1-candidate', 'live-eye-arc-v2-candidate').replace('ChangliEyeArcV1', 'ChangliEyeArcV2')
        page = page.replace('左闭眼浅弧', '双眼闭合浅弧').replace('左眼浅弧', '双眼浅弧')
        page = page.replace('左眼闭合曲面浅弧试作；右眼保留细分基线。', '左右闭合曲面浅弧试作；保留各自独立开合与视线。')
        page = page.replace("const leftChanged=['ArtMesh26','EyeLeft2'];", "const leftChanged=['ArtMesh26','EyeLeft2','ArtMesh25','EyeRight2'];")
        page = page.replace('const expectsChange=(params.ParamEyeLOpen??1)<1;',
                            "const expected=[...((params.ParamEyeLOpen??1)<1?['ArtMesh26','EyeLeft2']:[]),...((params.ParamEyeROpen??1)<1?['ArtMesh25','EyeRight2']:[])];")
        page = page.replace('(expectsChange?changed.length===2&&changed.every(id=>leftChanged.includes(id)):changed.length===0)',
                            '(changed.length===expected.length&&changed.every(id=>expected.includes(id)))')
        page = page.replace('{ParamEyeLOpen:0,ParamEyeROpen:1},', '{ParamEyeLOpen:0,ParamEyeROpen:1}, {ParamEyeLOpen:1,ParamEyeROpen:0},')
        page = page.replace('closed=set(core,{ParamEyeLOpen:0}),closedOld=set(old,{ParamEyeLOpen:0})',
                            'closed=set(core,{ParamEyeLOpen:0,ParamEyeROpen:0}),closedOld=set(old,{ParamEyeLOpen:0,ParamEyeROpen:0})')
        page = page.replace('const interpolation=[0,.125,.25,.375,.5,.625,.75,.875,1].map(open=>{',
                            "const interpolation=['left','right'].flatMap(side=>[0,.125,.25,.375,.5,.625,.75,.875,1].map(open=>{")
        page = page.replace('const pos=set(core,{ParamEyeLOpen:open}),oldPos=set(old,{ParamEyeLOpen:open});',
                            "const params=side==='left'?{ParamEyeLOpen:open}:{ParamEyeROpen:open};const pos=set(core,params),oldPos=set(old,params);")
        page = page.replace('for(const id of leftChanged){const i=at(id),j=old.drawables.ids.indexOf(id);for(let k=0;k<pos[i].length;k++)',
                            "for(const id of (side==='left'?['ArtMesh26','EyeLeft2']:['ArtMesh25','EyeRight2'])){const i=at(id),j=old.drawables.ids.indexOf(id);for(let k=0;k<pos[i].length;k++)")
        page = page.replace('return {open,linearResidualPixels:max,flips,degenerate,pass:max<.001&&flips===0&&degenerate===0};\n });',
                            'return {side,open,linearResidualPixels:max,flips,degenerate,pass:max<.001&&flips===0&&degenerate===0};\n }));')
        page = page.replace('Right closed-eye curve still unrefined; left arc is a trial', 'Both closed-eye arcs remain trials; eyelid placement and thickness need art refinement')
    (staging.HERE / f'eye-arc-v{version}-preview.html').write_text(page, encoding='utf-8')
