// Preserve all 43 v58 meshes; require exact equivalent -1.5/0/+1.5 degree geometry for only Rotation6 children.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v58-candidate/ChangliReferenceRepairV58.moc3')).arrayBuffer(),true);
 if(!baselineMoc) throw Error('Verified v58 Core baseline rejected');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const added=[];
 const rotated=new Set(['ArtMesh27','ArtMesh31','ArtMesh55','ArtMesh57','ArtMesh58']);
 const same=(a,b)=>JSON.stringify([...a])===JSON.stringify([...b]);
 const topology=oldIds.map(id=>{const i=ids.indexOf(id),j=oldIds.indexOf(id);return {id,pass:i>=0&&same(core.drawables.vertexUvs[i],baseline.drawables.vertexUvs[j])&&same(core.drawables.indices[i],baseline.drawables.indices[j])&&same([...core.drawables.masks[i]].map(k=>ids[k]),[...baseline.drawables.masks[j]].map(k=>oldIds[k]))};});
 const states=[{}];
 for(let i=0;i<core.parameters.count;i++) for(const v of [core.parameters.minimumValues[i],core.parameters.maximumValues[i]])states.push({[core.parameters.ids[i]]:v});
 for(let n=0;n<=100;n++)for(const z of [-30,0,30])states.push({ParamAngleZ:z,ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 for(const x of [-30,0,30])for(const y of [-30,0,30])for(const z of [-30,0,30])states.push({ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
 for(const sway of [-30,-15,0,15,30])for(const wing of [-30,0,30])for(const tail of [-30,0,30])states.push({ParamPhoenixSway:sway,ParamPhoenixWingSway:wing,ParamPhoenixTailSway:tail});
 for(const s of [-1,0,1])for(const x of [-30,0,30])for(const y of [-30,0,30])for(const z of [-30,0,30])states.push({ParamOrnamentLeftSway:s,ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
 const neutral=pose(model);
 if(added.some(id=>!ids.includes(id)))throw Error('Expected native keyboard/tail additions missing');
 const samples=states.map(params=>{const now=pose(model,params),old=pose(baselineModel,params);
 const s=params.ParamSideHairLeftSway??0;
 const expected=pose(baselineModel,{...params,ParamSideHairLeftSway:s*(s<0?1.5/9:1.5/8.4)});let maxPixels=0,opacityMax=0,wrongOrder=0,flips=0,degenerate=0,nonFinite=0;
 for(const id of oldIds){const i=ids.indexOf(id),j=oldIds.indexOf(id);now[i].forEach((v,k)=>maxPixels=Math.max(maxPixels,Math.abs(v-(rotated.has(id)?expected[j][k]:old[j][k]))*ppu));opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-baseline.drawables.opacities[j]));if(core.drawables.drawOrders[i]!==baseline.drawables.drawOrders[j])wrongOrder++;}
 ids.forEach((id,i)=>{nonFinite+=now[i].filter(v=>!Number.isFinite(v)).length;if(core.drawables.opacities[i]<.00001)return;const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(now[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}});
 const ki=ids.indexOf('ArtMesh56'),keyboardMotion=Math.max(...now[ki].map((v,k)=>Math.abs(v-neutral[ki][k])*ppu));
 return {params,maxPixels,opacityMax,wrongOrder,keyboardMotion,flips,degenerate,nonFinite,pass:maxPixels<.03&&opacityMax<.0001&&wrongOrder===0&&keyboardMotion<.03&&!flips&&!degenerate&&!nonFinite};});
 report.regressions={baselineVersion:58,preservedMeshes:oldIds.length-rotated.size,rotationEndpointDegrees:[-1.5,0,1.5],rotationChildren:[...rotated],expectedGeometry:"v58 geometry at equivalent interpolated Rotation6 angle",checkedMeshes:oldIds.length,topology,samples,pass:ids.length===oldIds.length&&topology.every(r=>r.pass)&&samples.every(r=>r.pass)};
 const oldTail=report.bounds.find(r=>r.id==='ArtMesh55'),tail=report.bounds.find(r=>r.id==='ArtMesh58'),tip=report.bounds.find(r=>r.id==='ArtMesh57'),keyboard=report.bounds.find(r=>r.id==='ArtMesh56');
 report.nativeTailCompletion={main:tail,tip,disabledOldTail:oldTail,pass:oldTail.opacity===0&&tail.drawOrder===389&&tail.opacity===1&&tail.vertices===4&&tip.drawOrder===410&&tip.opacity===1&&tip.vertices===4};
 report.nativeKeyboardReplacement={...keyboard,pass:keyboard.drawOrder===480&&keyboard.opacity===1&&keyboard.vertices===4&&Math.abs(keyboard.bounds[0]-275)<4&&Math.abs(keyboard.bounds[1]-927)<4&&Math.abs(keyboard.bounds[2]-1201)<4&&Math.abs(keyboard.bounds[3]-1087)<4};
 report.pass=report.regressions.pass&&report.nativeTailCompletion.pass&&report.nativeKeyboardReplacement.pass;
 report.formalArtComplete=false;pose(model);return {baselineMoc,baselineModel,neutral,repaired:ids};
}

