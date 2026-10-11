// Read-only official Core comparison for native gaze calibration.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v31-candidate/ChangliReferenceRepairV31.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected verified v31 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel();
 const neutral=pose(model),previousNeutral=pose(baselineModel),oldIds=[...baseline.drawables.ids];
 const irisIds=['ArtMesh24','ArtMesh23'],same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const center=v=>[v.filter((_,i)=>i%2===0).reduce((a,b)=>a+b,0)/(v.length/2)*ppu,
  -v.filter((_,i)=>i%2===1).reduce((a,b)=>a+b,0)/(v.length/2)*ppu];
 const topology=ids.map((id,i)=>{const j=oldIds.indexOf(id);return {id,pass:j>=0&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same(core.drawables.vertexUvs[i],baseline.drawables.vertexUvs[j])&&core.drawables.textureIndices[i]===baseline.drawables.textureIndices[j]&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 const alignment=irisIds.map(id=>{const i=ids.indexOf(id),j=oldIds.indexOf(id),a=center(neutral[i]),b=center(previousNeutral[j]);
  const delta=a.map((v,k)=>v-b[k]);let nonRigid=0;
  for(let k=0;k<neutral[i].length;k++)nonRigid=Math.max(nonRigid,Math.abs((neutral[i][k]-previousNeutral[j][k])*ppu-(k%2?-delta[1]:delta[0])));
  return {id,delta,nonRigid,pass:Math.abs(delta[0])>9&&Math.abs(delta[0])<13&&Math.abs(delta[1])<.05&&nonRigid<.001&&(id==='ArtMesh24'?delta[0]<0:delta[0]>0)};});
 const gaze=[];
 for(const x of [-1,-.5,0,.5,1])for(const y of [-1,0,1]){
  const p=pose(model,{ParamEyeBallX:x,ParamEyeBallY:y}),deltas=irisIds.map(id=>{const i=ids.indexOf(id),a=center(p[i]),b=center(neutral[i]);return a.map((v,k)=>v-b[k]);});
  const interEyeDifference=Math.abs(deltas[0][0]-deltas[1][0]);
  gaze.push({x,y,deltas,interEyeDifference,pass:interEyeDifference<.8&&deltas.every(d=>(x===0?Math.abs(d[0])<.001:d[0]*Math.sign(x)>9*Math.abs(x))&&(y===0?Math.abs(d[1])<.001:d[1]*Math.sign(y)<-4))});
 }
 const states=[{}];
 for(let i=0;i<core.parameters.count;i++)for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:value});
 for(let n=0;n<=100;n++)for(const angle of [-30,0,30])states.push({ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamAngleZ:angle,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 const samples=states.map(params=>{
  const p=pose(model,params),old=pose(baselineModel,params);let unrelatedMaxPixels=0,flips=0,degenerate=0,nonFinite=0,opacityMax=0;
  for(let i=0;i<ids.length;i++){
   const j=oldIds.indexOf(ids[i]);if(!irisIds.includes(ids[i]))for(let k=0;k<p[i].length;k++)unrelatedMaxPixels=Math.max(unrelatedMaxPixels,Math.abs(p[i][k]-old[j][k])*ppu);
   opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));
   nonFinite+=p[i].filter(v=>!Number.isFinite(v)).length;
   if(core.drawables.opacities[i]<.00001)continue;
   const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(p[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}
  }
  return {params,unrelatedMaxPixels,opacityMax,flips,degenerate,nonFinite,pass:unrelatedMaxPixels<.001&&opacityMax<.0001&&!flips&&!degenerate&&!nonFinite};
 });
 report.gazeAlignment={alignment,gaze,pass:alignment.every(a=>a.pass)&&gaze.every(g=>g.pass)};
 report.regressions={baselineVersion:31,topology,samples,pass:ids.length===oldIds.length&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.pass=report.gazeAlignment.pass&&report.regressions.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:ids};
}
