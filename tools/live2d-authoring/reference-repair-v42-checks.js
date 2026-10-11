// Inspect native sleeve attachment keyforms independently of the authoring UI.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v41-candidate/ChangliReferenceRepairV41.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected v41 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const neutral=pose(model),previousNeutral=pose(baselineModel),changed='ArtMesh33';
 const same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const topology=ids.map((id,i)=>{const j=oldIds.indexOf(id);return {id,pass:j>=0&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same(core.drawables.vertexUvs[i],baseline.drawables.vertexUvs[j])&&core.drawables.textureIndices[i]===baseline.drawables.textureIndices[j]&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 let neutralMaxPixels=0;
 for(let i=0;i<ids.length;i++){const j=oldIds.indexOf(ids[i]);for(let k=0;k<neutral[i].length;k++)neutralMaxPixels=Math.max(neutralMaxPixels,Math.abs(neutral[i][k]-previousNeutral[j][k])*ppu);}
 const states=[{}];
 for(let i=0;i<core.parameters.count;i++)for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:value});
 for(let n=0;n<=100;n++)for(const angle of [-30,0,30])states.push({ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamAngleZ:angle,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 const samples=states.map(params=>{
  const p=pose(model,params),old=pose(baselineModel,params);let unrelatedMaxPixels=0,flips=0,degenerate=0,nonFinite=0,opacityMax=0;
  for(let i=0;i<ids.length;i++){
   const j=oldIds.indexOf(ids[i]);if(ids[i]!==changed)for(let k=0;k<p[i].length;k++)unrelatedMaxPixels=Math.max(unrelatedMaxPixels,Math.abs(p[i][k]-old[j][k])*ppu);
   opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));nonFinite+=p[i].filter(v=>!Number.isFinite(v)).length;
   if(core.drawables.opacities[i]<.00001)continue;
   const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(p[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}
  }
  return {params,unrelatedMaxPixels,opacityMax,flips,degenerate,nonFinite,pass:unrelatedMaxPixels<.001&&opacityMax<.0001&&!flips&&!degenerate&&!nonFinite};
 });
 const index=ids.indexOf(changed),oldIndex=oldIds.indexOf(changed),anchorVertices=[13,14,15,16];
 const attachments=[-30,30].map(angle=>{
  const current=pose(model,{ParamAngleZ:angle})[index],old=pose(baselineModel,{ParamAngleZ:angle})[oldIndex];
  const vertices=anchorVertices.map(vertex=>{const k=vertex*2,n=previousNeutral[oldIndex];return {vertex,previousDistancePixels:Math.hypot(old[k]-n[k],old[k+1]-n[k+1])*ppu,currentDistancePixels:Math.hypot(current[k]-n[k],current[k+1]-n[k+1])*ppu};});
  const previousMax=Math.max(...vertices.map(v=>v.previousDistancePixels)),currentMax=Math.max(...vertices.map(v=>v.currentDistancePixels));
  return {angle,vertices,previousMax,currentMax,pass:currentMax<12&&currentMax<previousMax*.4};
 });
 report.nativeCuffAttachment={mesh:changed,nativeWarp:'LeftCuffAttachment / Warp13',anchorVertices,neutralMaxPixels,attachments,pass:neutralMaxPixels<.003&&attachments.every(a=>a.pass)};
 report.regressions={baselineVersion:41,topology,samples,pass:ids.length===oldIds.length&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.pass=report.nativeCuffAttachment.pass&&report.regressions.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:[changed]};
}
