// Compare the native contour edit against the independently passed gaze model.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v32-candidate/ChangliReferenceRepairV32.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected v32 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const neutral=pose(model),previousNeutral=pose(baselineModel),changed='ArtMesh31';
 const same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 // Cubism automatically reconnects triangles when a contour vertex moves.
 // Only this edited mesh may change indices; vertex count and valid indices
 // remain mandatory, and every visible triangle is checked in all poses below.
 const topology=ids.map((id,i)=>{const j=oldIds.indexOf(id),tri=core.drawables.indices[i],vertexCount=core.drawables.vertexPositions[i].length/2;
  const contourTopology=id===changed&&vertexCount===33&&tri.length%3===0&&[...tri].every(k=>Number.isInteger(k)&&k>=0&&k<vertexCount);
  return {id,indicesChanged:j>=0&&!same(tri,baseline.drawables.indices[j]),pass:j>=0&&(contourTopology||same(tri,baseline.drawables.indices[j]))&&(id===changed||same(core.drawables.vertexUvs[i],baseline.drawables.vertexUvs[j]))&&core.drawables.textureIndices[i]===baseline.drawables.textureIndices[j]&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 const index=ids.indexOf(changed),oldIndex=oldIds.indexOf(changed);
 const changes=[];
 for(let k=0;k<neutral[index].length;k+=2){
  const delta=[(neutral[index][k]-previousNeutral[oldIndex][k])*ppu,-(neutral[index][k+1]-previousNeutral[oldIndex][k+1])*ppu];
  const uvDelta=[core.drawables.vertexUvs[index][k]-baseline.drawables.vertexUvs[oldIndex][k],core.drawables.vertexUvs[index][k+1]-baseline.drawables.vertexUvs[oldIndex][k+1]];
  if(delta.some(v=>Math.abs(v)>.001)||uvDelta.some(v=>Math.abs(v)>1e-7))changes.push({vertex:k/2,delta,uvDelta});
 }
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
 const expected=new Map([[5,-9.1743],[12,7.6453],[26,6.1162]]);
 report.contourRepair={mesh:changed,changes,pass:changes.length===3&&changes.every(c=>expected.has(c.vertex)&&Math.abs(c.delta[0])<.001&&Math.abs(c.delta[1]-expected.get(c.vertex))<.002)};
 report.regressions={baselineVersion:32,topology,samples,pass:ids.length===oldIds.length&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.pass=report.contourRepair.pass&&report.regressions.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:ids};
}
