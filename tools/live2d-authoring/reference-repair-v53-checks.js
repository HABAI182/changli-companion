// Compare native geometry against the last verified head rig and audit the
// replacement Phoenix at actual parameter extremes, including combined poses.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v52-candidate/ChangliReferenceRepairV52.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected v52 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const replaced=[],added=['ArtMesh52','ArtMesh53'];
 const preserved=oldIds.filter(id=>!['ArtMesh38','ArtMesh41'].includes(id));
 report.meshUvChanges=ids.map((id,i)=>{const j=oldIds.indexOf(id);const a=core.drawables.vertexUvs[i],b=baseline.drawables.vertexUvs[j];const d=[...a].map((v,k)=>Math.abs(v-b[k]));return {id,coordinates:d.filter(v=>v>1e-7).length,maxUv:Math.max(...d)};}).filter(r=>r.coordinates);const neutral=pose(model),same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const topology=preserved.map(id=>{const i=ids.indexOf(id),j=oldIds.indexOf(id);return {id,pass:i>=0&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 const states=[{}];
 for(let i=0;i<core.parameters.count;i++)for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:value});
 for(let n=0;n<=100;n++)for(const z of [-30,0,30])states.push({ParamAngleZ:z,ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 for(const x of [-30,0,30])for(const y of [-30,0,30])for(const z of [-30,0,30])states.push({ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
 for(const sway of [-30,-15,0,15,30])for(const wing of [-30,0,30])for(const tail of [-30,0,30])states.push({ParamPhoenixSway:sway,ParamPhoenixWingSway:wing,ParamPhoenixTailSway:tail});
 for(const swing of [-1,0,1])for(const x of [-30,0,30])for(const y of [-30,0,30])for(const z of [-30,0,30])states.push({ParamOrnamentLeftSway:swing,ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
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
 const contourIndex=ids.indexOf('ArtMesh38'),oldContourIndex=oldIds.indexOf('ArtMesh38');
 const currentContour=pose(model)[contourIndex],oldContour=pose(baselineModel)[oldContourIndex];
 const contourDelta=currentContour.map((v,k)=>Math.abs(v-oldContour[k])*ppu);
 report.nativeGoldContour={id:'ArtMesh38',changedCoordinates:contourDelta.filter(v=>v>.03).length,maxPixels:Math.max(...contourDelta),pass:contourDelta.filter(v=>v>.03).length>0&&contourDelta.filter(v=>v>.03).length<=8&&Math.max(...contourDelta)<25};
 report.regressions={baselineVersion:52,preservedMeshes:preserved.length,topology,samples,pass:ids.length===38&&replaced.every(id=>!ids.includes(id))&&added.every(id=>ids.includes(id))&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.nativePhoenix={meshes:['ArtMesh49','ArtMesh50','ArtMesh51'],motion,pass:motion.every(s=>s.pass)};
 const joins=[];
 for(const id of added)for(const params of [{ParamAngleX:-30},{ParamAngleX:30},{ParamAngleY:-30},{ParamAngleY:30},{ParamAngleZ:-30},{ParamAngleZ:30}]){
  const i=ids.indexOf(id),p=pose(model,params),maxPixels=Math.max(...p[i].map((v,k)=>Math.abs(v-neutral[i][k])*ppu));
  joins.push({id,params,maxPixels,drawOrder:core.drawables.drawOrders[i],pass:maxPixels>1&&maxPixels<500&&core.drawables.drawOrders[i]===430});
 }
 report.nativeShoulderJoins={samples:joins,pass:joins.every(s=>s.pass)};
 const ornament=[];
 for(const value of [-1,1]){
  const p=pose(model,{ParamOrnamentLeftSway:value})[contourIndex],delta=p.map((v,k)=>Math.abs(v-currentContour[k])*ppu);
  const vertices=[];for(let i=0;i<delta.length;i+=2)if(Math.max(delta[i],delta[i+1])>.03)vertices.push({index:i/2,x:currentContour[i]*ppu+core.canvasinfo.CanvasOriginX,y:-currentContour[i+1]*ppu+core.canvasinfo.CanvasOriginY,maxPixels:Math.max(delta[i],delta[i+1])});
  ornament.push({value,vertices,maxPixels:Math.max(...delta),pass:vertices.length>=2&&vertices.length<=6&&Math.max(...delta)>1&&Math.max(...delta)<20&&vertices.every(v=>v.x>120&&v.x<300&&v.y>400&&v.y<620)});
 }
 report.nativeLeftOrnament={scope:'Local native ArtMesh38 pendant deformation; main upper bow remains embedded in hair',samples:ornament,pass:ornament.every(s=>s.pass)};
 const fi=ids.indexOf('ArtMesh41'),fo=oldIds.indexOf('ArtMesh41');
 const faceNow=pose(model)[fi],faceOld=pose(baselineModel)[fo];
 const faceDelta=faceNow.map((v,k)=>Math.abs(v-faceOld[k])*ppu);
 report.nativeFaceContour={changedCoordinates:faceDelta.filter(v=>v>.03).length,maxPixels:Math.max(...faceDelta),pass:faceDelta.filter(v=>v>.03).length>0&&faceDelta.filter(v=>v>.03).length<=8&&Math.max(...faceDelta)<25};
 report.pass=report.nativeFaceContour.pass&&report.nativeLeftOrnament.pass&&report.nativeShoulderJoins.pass&&report.regressions.pass&&report.nativePhoenix.pass&&report.nativeGoldContour.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:[...added,'ArtMesh38']};
}
