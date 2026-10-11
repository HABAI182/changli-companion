// Verify the native rotation key edits against independently passed v38.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v38-candidate/ChangliReferenceRepairV38.moc3')).arrayBuffer(),true);
 if(!baselineMoc)throw Error('Core rejected v38 baseline');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const neutral=pose(model),previousNeutral=pose(baselineModel),oldPositive=pose(baselineModel,{ParamAngleZ:30});
 const same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const topology=ids.map((id,i)=>{const j=oldIds.indexOf(id);return {id,pass:j>=0&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same(core.drawables.vertexUvs[i],baseline.drawables.vertexUvs[j])&&core.drawables.textureIndices[i]===baseline.drawables.textureIndices[j]&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 const center=p=>{let x=0,y=0;for(let k=0;k<p.length;k+=2){x+=p[k];y+=p[k+1];}return [x/(p.length/2),y/(p.length/2)];};
 const fit=(a,b)=>{const ca=center(a),cb=center(b);let dot=0,cross=0;for(let k=0;k<a.length;k+=2){const x=a[k]-ca[0],y=a[k+1]-ca[1],u=b[k]-cb[0],v=b[k+1]-cb[1];dot+=x*u+y*v;cross+=x*v-y*u;}const angle=Math.atan2(cross,dot),c=Math.cos(angle),s=Math.sin(angle);return {angle,translation:[cb[0]-c*ca[0]+s*ca[1],cb[1]-s*ca[0]-c*ca[1]]};};
 const head=ids.indexOf('ArtMesh38'),oldHead=oldIds.indexOf('ArtMesh38'),oldFit=fit(previousNeutral[oldHead],oldPositive[oldHead]);
 const a=1-Math.cos(oldFit.angle),b=Math.sin(oldFit.angle),den=a*a+b*b;
 const pivot=[(a*oldFit.translation[0]-b*oldFit.translation[1])/den,(b*oldFit.translation[0]+a*oldFit.translation[1])/den];
 const affected=new Set(oldIds.filter((id,i)=>oldPositive[i].some((v,k)=>Math.abs(v-previousNeutral[i][k])*ppu>.001)));
 let neutralMaxPixels=0;for(let i=0;i<ids.length;i++){const j=oldIds.indexOf(ids[i]);for(let k=0;k<neutral[i].length;k++)neutralMaxPixels=Math.max(neutralMaxPixels,Math.abs(neutral[i][k]-previousNeutral[j][k])*ppu);}
 const endpoints=[-30,30].map(value=>{const next=pose(model,{ParamAngleZ:value}),old=pose(baselineModel,{ParamAngleZ:value}),f=fit(neutral[head],next[head]),g=fit(previousNeutral[oldHead],old[oldHead]);return {parameter:value,oldDegrees:g.angle*180/Math.PI,degrees:f.angle*180/Math.PI,ratio:f.angle/g.angle,pass:Math.abs(Math.abs(f.angle*180/Math.PI)-5)<.01&&Math.abs(f.angle/g.angle-2.5)<.01};});
 const states=[{}];for(let i=0;i<core.parameters.count;i++)for(const value of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:value});
 for(let n=0;n<=100;n++)for(const angle of [-30,0,30])states.push({ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamAngleZ:angle,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 const samples=states.map(params=>{const p=pose(model,params),old=pose(baselineModel,params),angle=oldFit.angle*1.5*(params.ParamAngleZ??0)/30,c=Math.cos(angle),s=Math.sin(angle);let expectedMaxPixels=0,fixedMaxPixels=0,flips=0,degenerate=0,nonFinite=0,opacityMax=0;
  for(let i=0;i<ids.length;i++){const j=oldIds.indexOf(ids[i]);for(let k=0;k<p[i].length;k+=2){let x=old[j][k],y=old[j][k+1];if(affected.has(ids[i])){const u=x-pivot[0],v=y-pivot[1];x=pivot[0]+c*u-s*v;y=pivot[1]+s*u+c*v;}else fixedMaxPixels=Math.max(fixedMaxPixels,Math.abs(p[i][k]-x)*ppu,Math.abs(p[i][k+1]-y)*ppu);expectedMaxPixels=Math.max(expectedMaxPixels,Math.abs(p[i][k]-x)*ppu,Math.abs(p[i][k+1]-y)*ppu);}
   opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));nonFinite+=p[i].filter(v=>!Number.isFinite(v)).length;if(core.drawables.opacities[i]<.00001)continue;const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(p[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}}
  return {params,expectedMaxPixels,fixedMaxPixels,opacityMax,flips,degenerate,nonFinite,pass:expectedMaxPixels<.05&&fixedMaxPixels<.001&&opacityMax<.0001&&!flips&&!degenerate&&!nonFinite};});
 report.nativeHeadRotation={endpoints,neutralMaxPixels,pivot,affected:[...affected],fixed:ids.filter(id=>!affected.has(id)),pass:neutralMaxPixels<.001&&endpoints.every(e=>e.pass)};
 report.regressions={baselineVersion:38,topology,samples,pass:ids.length===oldIds.length&&topology.every(t=>t.pass)&&samples.every(s=>s.pass)};
 report.pass=report.nativeHeadRotation.pass&&report.regressions.pass;report.formalArtComplete=false;
 pose(model);return {baselineMoc,baselineModel,neutral,repaired:ids};
}
