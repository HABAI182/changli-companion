// Read-only acceptance for native Cubism remeshing. UV-space barycentric
// mapping compares each new vertex with the old rendered surface, including
// all native parameter endpoints and mixed poses. No resource bytes are edited.
export async function checkPhoenixMeshes({model, core, ids, ppu, report, CubismMoc, pose, area}) {
  const baselineMoc = CubismMoc.create(await (await fetch('/models/changli/live-reference-repair-v29-candidate/ChangliReferenceRepairV29.moc3')).arrayBuffer(), true);
  if (!baselineMoc) throw Error('Core rejected v29 baseline');
  const baselineModel = baselineMoc.createModel(), old = baselineModel.getModel();
  const oldIds = [...old.drawables.ids], neutral = pose(model), repaired = ['ArtMesh16','ArtMesh15','ArtMesh8'];
  const same = (a,b) => JSON.stringify([...a]) === JSON.stringify([...b]);
  const parameterIdentity = ['ids','minimumValues','maximumValues','defaultValues'].every(k => same(core.parameters[k],old.parameters[k]));
  const topology = oldIds.map(id => {
    const i = ids.indexOf(id), j = oldIds.indexOf(id);
    return {id, remeshed: repaired.includes(id), pass: i >= 0 &&
      (repaired.includes(id) || (same(core.drawables.indices[i],old.drawables.indices[j]) && same(core.drawables.vertexUvs[i],old.drawables.vertexUvs[j]))) &&
      core.drawables.textureIndices[i] === old.drawables.textureIndices[j] && core.drawables.constantFlags[i] === old.drawables.constantFlags[j] &&
      same([...core.drawables.masks[i]].map(k=>ids[k]),[...old.drawables.masks[j]].map(k=>oldIds[k]))};
  });
  const mapping = repaired.map(id => {
    const i = ids.indexOf(id), j = oldIds.indexOf(id), uv = core.drawables.vertexUvs[i], oldUv = old.drawables.vertexUvs[j], tri = old.drawables.indices[j];
    const vertices = [];
    for(let k=0;k<uv.length;k+=2) {
      let best;
      for(let t=0;t<tri.length;t+=3) {
        const [a,b,c] = [...tri.slice(t,t+3)], ax=oldUv[a*2], ay=oldUv[a*2+1], bx=oldUv[b*2], by=oldUv[b*2+1], cx=oldUv[c*2], cy=oldUv[c*2+1];
        const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
        const wa=((by-cy)*(uv[k]-cx)+(cx-bx)*(uv[k+1]-cy))/det;
        const wb=((cy-ay)*(uv[k]-cx)+(ax-cx)*(uv[k+1]-cy))/det, wc=1-wa-wb;
        const score=Math.min(wa,wb,wc);
        if(!best || score>best.score) best={a,b,c,weights:[wa,wb,wc],score};
      }
      vertices.push(best);
    }
    return {id,i,j,vertices};
  });
  const states=[{}];
  for(let i=0;i<core.parameters.count;i++) for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]]) states.push({[core.parameters.ids[i]]:value});
  for(const angle of [-30,0,30]) for(let n=0;n<=100;n++) states.push({ParamAngleZ:angle,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,
    ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamBangCenterSway:n/50-1,ParamSideHairLeftSway:1-n/50,ParamSideHairRightSway:n/50-1,
    ParamHandLeftPress:n*.3,ParamHandRightPress:30-n*.3,ParamMouthOpenY:n/100,
    ParamPhoenixSway:30*Math.sin(n/100*Math.PI*2),ParamPhoenixTailSway:30*Math.cos(n/100*Math.PI*2),ParamPhoenixWingSway:30*Math.sin(n/100*Math.PI*4)});
  const samples=states.map(params=> {
    const current=pose(model,params),previous=pose(baselineModel,params);
    let positionMaxPixels=0,surfaceMaxPixels=0,opacityMax=0,drawOrderMax=0,flips=0,degenerate=0,nonFinite=0;
    for(let i=0;i<ids.length;i++) {
      const j=oldIds.indexOf(ids[i]);
      nonFinite+=current[i].filter(v=>!Number.isFinite(v)).length;
      if(j>=0) {
        if(!repaired.includes(ids[i])) for(let k=0;k<current[i].length;k++) positionMaxPixels=Math.max(positionMaxPixels,Math.abs(current[i][k]-previous[j][k])*ppu);
        opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-old.drawables.opacities[j]));
        drawOrderMax=Math.max(drawOrderMax,Math.abs(core.drawables.drawOrders[i]-old.drawables.drawOrders[j]));
      }
      if(core.drawables.opacities[i]<.00001) continue;
      const tri=core.drawables.indices[i];
      for(let k=0;k<tri.length;k+=3) {
        const a=area(current[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));
        if(a*b<0)flips++; if(Math.abs(a)<1e-12)degenerate++;
      }
    }
    for(const m of mapping) for(let k=0;k<m.vertices.length;k++) for(let axis=0;axis<2;axis++) {
      const v=m.vertices[k],expected=[v.a,v.b,v.c].reduce((sum,index,h)=>sum+previous[m.j][index*2+axis]*v.weights[h],0);
      surfaceMaxPixels=Math.max(surfaceMaxPixels,Math.abs(current[m.i][k*2+axis]-expected)*ppu);
    }
    return {params,positionMaxPixels,surfaceMaxPixels,opacityMax,drawOrderMax,flips,degenerate,nonFinite,
      pass:positionMaxPixels<.001 && surfaceMaxPixels<.01 && opacityMax<.0001 && drawOrderMax===0 && !flips && !degenerate && !nonFinite};
  });
  const meshDetails=repaired.map(id=>({...report.bounds[ids.indexOf(id)],previousVertices:old.drawables.vertexPositions[oldIds.indexOf(id)].length/2}));
  const fixedIds=['ArtMesh8','ArtMesh9','ArtMesh10','ArtMesh15','ArtMesh16','ArtMesh20'];
  const independence=[-30,30].map(angle=> {
    const p=pose(model,{ParamAngleZ:angle});
    const fixedMaxPixels=Math.max(...fixedIds.flatMap(id=>p[ids.indexOf(id)].map((v,k)=>Math.abs(v-neutral[ids.indexOf(id)][k])*ppu)));
    return {angle,fixedMaxPixels,pass:fixedMaxPixels<.001};
  });
  report.regressions={baselineVersion:29,parameterIdentity,topology,samples,pass:parameterIdentity&&ids.length===oldIds.length&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
  report.phoenixMeshes={meshes:meshDetails,surfaceMaxPixels:Math.max(...samples.map(s=>s.surfaceMaxPixels)),pass:meshDetails.every(m=>m.previousVertices===4&&m.vertices>20)};
  report.headIndependence={fixedIds,samples:independence,pass:independence.every(s=>s.pass)};
  report.pass=report.regressions.pass&&report.phoenixMeshes.pass&&report.headIndependence.pass;
  report.formalArtComplete=false;
  pose(model);
  return {baselineMoc,baselineModel,neutral,repaired};
}
