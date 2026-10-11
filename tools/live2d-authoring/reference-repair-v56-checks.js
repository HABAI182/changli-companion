// Compare every existing mesh against the verified v55 export; only a new
// root-level reference backfill is allowed. Screenshot QA accepts its edges.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
  const baselineMoc = CubismMoc.create(await (await fetch('/models/changli/live-reference-repair-v55-candidate/ChangliReferenceRepairV55.moc3')).arrayBuffer(), true);
  if (!baselineMoc) throw Error('Core rejected verified v55 baseline');
  const baselineModel = baselineMoc.createModel(), baseline = baselineModel.getModel();
  const oldIds = [...baseline.drawables.ids], added = 'ArtMesh54';
  const same = (a,b) => JSON.stringify([...a]) === JSON.stringify([...b]);
  const topology = oldIds.map(id => {
    const i=ids.indexOf(id), j=oldIds.indexOf(id);
    return {id,pass:i>=0 && same(core.drawables.vertexUvs[i],baseline.drawables.vertexUvs[j]) &&
      same(core.drawables.indices[i],baseline.drawables.indices[j]) &&
      same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};
  });
  const states=[{}];
  for(let i=0;i<core.parameters.count;i++) for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]]) states.push({[core.parameters.ids[i]]:value});
  for(let n=0;n<=100;n++) for(const z of [-30,0,30]) states.push({ParamAngleZ:z,ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
  for(const x of [-30,0,30]) for(const y of [-30,0,30]) for(const z of [-30,0,30]) states.push({ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
  for(const sway of [-30,-15,0,15,30]) for(const wing of [-30,0,30]) for(const tail of [-30,0,30]) states.push({ParamPhoenixSway:sway,ParamPhoenixWingSway:wing,ParamPhoenixTailSway:tail});
  for(const swing of [-1,0,1]) for(const x of [-30,0,30]) for(const y of [-30,0,30]) for(const z of [-30,0,30]) states.push({ParamOrnamentLeftSway:swing,ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
  const neutral=pose(model), patchIndex=ids.indexOf(added);
  if(patchIndex<0) throw Error('Native cuff backfill missing');
  const samples=states.map(params=>{
    const vertices=pose(model,params), previous=pose(baselineModel,params);
    let maxPixels=0,opacityMax=0,wrongOrder=0,flips=0,degenerate=0,nonFinite=0;
    for(const id of oldIds){
      const i=ids.indexOf(id),j=oldIds.indexOf(id);
      vertices[i].forEach((value,k)=>maxPixels=Math.max(maxPixels,Math.abs(value-previous[j][k])*ppu));
      opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));
      if(core.drawables.drawOrders[i]!==baseline.drawables.drawOrders[j]) wrongOrder++;
    }
    ids.forEach((id,i)=>{
      nonFinite+=vertices[i].filter(v=>!Number.isFinite(v)).length;
      if(core.drawables.opacities[i]<.00001) return;
      const tri=core.drawables.indices[i];
      for(let k=0;k<tri.length;k+=3){const a=area(vertices[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}
    });
    const patchMotion=Math.max(...vertices[patchIndex].map((v,k)=>Math.abs(v-neutral[patchIndex][k])*ppu));
    return {params,maxPixels,opacityMax,wrongOrder,patchMotion,flips,degenerate,nonFinite,
      pass:maxPixels<.03&&opacityMax<.0001&&wrongOrder===0&&patchMotion<.03&&!flips&&!degenerate&&!nonFinite};
  });
  report.regressions={baselineVersion:55,preservedMeshes:oldIds.length,topology,samples,
    pass:ids.length===oldIds.length+1&&topology.every(r=>r.pass)&&samples.every(r=>r.pass)};
  const bounds=report.bounds.find(r=>r.id===added);
  report.nativeCuffBackfill={id:added,rootAttachment:true,drawOrder:bounds.drawOrder,bounds:bounds.bounds,
    scope:'Intact reference pixels under existing hair/cuff; visual seam review required',
    pass:bounds.drawOrder===385&&bounds.vertices===4&&bounds.opacity===1&&
      Math.abs(bounds.bounds[0]-169)<2&&Math.abs(bounds.bounds[1]-799)<2&&
      Math.abs(bounds.bounds[2]-261)<2&&Math.abs(bounds.bounds[3]-911)<2};
  const faceIndex=ids.indexOf('ArtMesh41');
  report.nativeFaceLayering={baselineVersion:55,faceId:'ArtMesh41',newOrder:core.drawables.drawOrders[faceIndex],
    pass:core.drawables.drawOrders[faceIndex]===496&&samples.every(r=>r.wrongOrder===0)};
  report.pass=report.regressions.pass&&report.nativeCuffBackfill.pass&&report.nativeFaceLayering.pass;
  report.formalArtComplete=false;
  pose(model);
  return {baselineMoc,baselineModel,neutral,repaired:ids};
}
