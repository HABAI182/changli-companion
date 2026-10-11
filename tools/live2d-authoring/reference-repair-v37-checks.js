// Native clipping-only change. Geometry/UV/parameters must remain exact.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v36-candidate/ChangliReferenceRepairV36.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected v36 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids],neutral=pose(model);
 const same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const topology=ids.map((id,i)=>{const j=oldIds.indexOf(id),masks=[...core.drawables.masks[i]].map(k=>ids[k]),oldMasks=[...baseline.drawables.masks[j]].map(k=>oldIds[k]);
  return {id,masks,oldMasks,pass:j>=0&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same(core.drawables.vertexUvs[i],baseline.drawables.vertexUvs[j])&&core.drawables.textureIndices[i]===baseline.drawables.textureIndices[j]&&same(masks,id==='ArtMesh40'?['ArtMesh18']:oldMasks)};});
 const states=[{}];for(let i=0;i<core.parameters.count;i++)for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:value});
 for(let n=0;n<=100;n++)for(const angle of [-30,0,30])states.push({ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamAngleZ:angle,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 const samples=states.map(params=>{const p=pose(model,params),old=pose(baselineModel,params);let unrelatedMaxPixels=0,flips=0,degenerate=0,nonFinite=0,opacityMax=0;
  for(let i=0;i<ids.length;i++){const j=oldIds.indexOf(ids[i]);for(let k=0;k<p[i].length;k++)unrelatedMaxPixels=Math.max(unrelatedMaxPixels,Math.abs(p[i][k]-old[j][k])*ppu);
   opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));nonFinite+=p[i].filter(v=>!Number.isFinite(v)).length;
   if(core.drawables.opacities[i]<.00001)continue;const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(p[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}}
  return {params,unrelatedMaxPixels,opacityMax,flips,degenerate,nonFinite,pass:unrelatedMaxPixels<.001&&opacityMax<.0001&&!flips&&!degenerate&&!nonFinite};});
 report.contourRepair={mesh:'ArtMesh40',nativeClippingMask:'ArtMesh18',pixelAppearanceRequiresVisualReview:true,pass:topology.every(t=>t.pass)};
 report.regressions={baselineVersion:36,topology,samples,pass:ids.length===oldIds.length&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.pass=report.contourRepair.pass&&report.regressions.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:ids};
}
