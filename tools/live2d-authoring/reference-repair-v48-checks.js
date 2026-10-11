// Compare native geometry against the last verified head rig and audit the
// replacement Phoenix at actual parameter extremes, including combined poses.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v46-candidate/ChangliReferenceRepairV46.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected v46 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const replaced=['ArtMesh8','ArtMesh15','ArtMesh16'],added=['ArtMesh49','ArtMesh50','ArtMesh51'];
 const preserved=oldIds.filter(id=>!replaced.includes(id));
 const neutral=pose(model),same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const topology=preserved.map(id=>{const i=ids.indexOf(id),j=oldIds.indexOf(id);return {id,pass:i>=0&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 const states=[{}];
 for(let i=0;i<core.parameters.count;i++)for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:value});
 for(let n=0;n<=100;n++)for(const z of [-30,0,30])states.push({ParamAngleZ:z,ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 for(const x of [-30,0,30])for(const y of [-30,0,30])for(const z of [-30,0,30])states.push({ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
 for(const sway of [-30,-15,0,15,30])for(const wing of [-30,0,30])for(const tail of [-30,0,30])states.push({ParamPhoenixSway:sway,ParamPhoenixWingSway:wing,ParamPhoenixTailSway:tail});
 const samples=states.map(params=>{
  const p=pose(model,params),old=pose(baselineModel,params);let maxPixels=0,opacityMax=0,flips=0,degenerate=0,nonFinite=0;
  for(let i=0;i<ids.length;i++){
   const j=oldIds.indexOf(ids[i]);
   if(preserved.includes(ids[i])){
    for(let k=0;k<p[i].length;k++)maxPixels=Math.max(maxPixels,Math.abs(p[i][k]-old[j][k])*ppu);
    opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));
   }
   nonFinite+=p[i].filter(v=>!Number.isFinite(v)).length;
   if(core.drawables.opacities[i]<.00001)continue;
   const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(p[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}
  }
  return {params,maxPixels,opacityMax,flips,degenerate,nonFinite,pass:maxPixels<.03&&opacityMax<.0001&&!flips&&!degenerate&&!nonFinite};
 });
 const motion=[];
 for(const [id,parameter] of [['ArtMesh50','ParamPhoenixSway'],['ArtMesh49','ParamPhoenixWingSway'],['ArtMesh51','ParamPhoenixTailSway']])for(const value of [-30,30]){
  const i=ids.indexOf(id);if(i<0){motion.push({id,parameter,value,pass:false});continue;}
  const p=pose(model,{[parameter]:value}),maxPixels=Math.max(...p[i].map((v,k)=>Math.abs(v-neutral[i][k])*ppu));
  motion.push({id,parameter,value,maxPixels,pass:maxPixels>1&&maxPixels<120});
 }
 report.regressions={baselineVersion:46,preservedMeshes:preserved.length,topology,samples,pass:ids.length===36&&replaced.every(id=>!ids.includes(id))&&added.every(id=>ids.includes(id))&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.nativePhoenix={meshes:added,motion,pass:motion.every(s=>s.pass)};
 report.pass=report.regressions.pass&&report.nativePhoenix.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:added};
}
