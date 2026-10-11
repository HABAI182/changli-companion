// Check actual native XY deformation and regressions outside the new parameters.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v45-candidate/ChangliReferenceRepairV45.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected v45 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const neutral=pose(model),oldNeutral=pose(baselineModel);
 const same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const topology=ids.map((id,i)=>{const j=oldIds.indexOf(id);return {id,pass:j>=0&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 const stable=['ArtMesh8','ArtMesh9','ArtMesh10','ArtMesh15','ArtMesh16','ArtMesh20'];
 const states=[{}];
 for(let i=0;i<core.parameters.count;i++)for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:value});
 for(let n=0;n<=100;n++)for(const angle of [-30,0,30])states.push({ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamAngleZ:angle,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 for(const x of [-30,-15,0,15,30])for(const y of [-30,-15,0,15,30])for(const z of [-30,0,30])states.push({ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
 const samples=states.map(params=>{
  const p=pose(model,params),old=pose(baselineModel,params);let maxPixels=0,stablePixels=0,flips=0,degenerate=0,nonFinite=0,opacityMax=0;
  for(let i=0;i<ids.length;i++){
   const j=oldIds.indexOf(ids[i]);for(let k=0;k<p[i].length;k++){const d=Math.abs(p[i][k]-old[j][k])*ppu;maxPixels=Math.max(maxPixels,d);if(stable.includes(ids[i]))stablePixels=Math.max(stablePixels,d);}
   opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));nonFinite+=p[i].filter(v=>!Number.isFinite(v)).length;
   if(core.drawables.opacities[i]<.00001)continue;
   const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(p[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}
  }
  const xy=Boolean(params.ParamAngleX||params.ParamAngleY);
  return {params,maxPixels,stablePixels,opacityMax,flips,degenerate,nonFinite,pass:(xy?maxPixels<40:maxPixels<.03)&&stablePixels<.03&&opacityMax<.0001&&!flips&&!degenerate&&!nonFinite};
 });
 const motion=[];
 for(const axis of ['ParamAngleX','ParamAngleY'])for(const value of [-30,30]){
  const p=pose(model,{[axis]:value}),i=ids.indexOf('ArtMesh41');
  const delta=p[i].map((v,k)=>(v-neutral[i][k])*ppu);const maxPixels=Math.max(...delta.map(Math.abs));
  const spread=Math.max(...delta)-Math.min(...delta);
  motion.push({axis,value,maxPixels,spread,pass:maxPixels>3&&maxPixels<40&&spread>2});
 }
 report.nativeHeadXY={keyforms:'Native Warp14 nine XY keyforms, axis forms and Editor synthesized four corners',motion,pass:motion.every(s=>s.pass)};
 report.regressions={baselineVersion:45,topology,samples,pass:ids.length===oldIds.length&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.pass=report.nativeHeadXY.pass&&report.regressions.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:[]};
}
