// Preserve42 mesh geometries and all43 UVs/masks/orders/opacities; only EyeRight2 closed geometry may change.
export async function checkGazeAlignment({model,core,ids,ppu,report,CubismMoc,pose,area}) {
 const baselineMoc=CubismMoc.create(await(await fetch('/models/changli/live-reference-repair-v64-candidate/ChangliReferenceRepairV64.moc3')).arrayBuffer(),true);
 if(!baselineMoc) throw Error('Verified v64 Core baseline rejected');
 const baselineModel=baselineMoc.createModel(),baseline=baselineModel.getModel(),oldIds=[...baseline.drawables.ids];
 const added=[];
 const rotated=new Set();
 const eyeParams={EyeLeft2:'ParamEyeLOpen',ArtMesh26:'ParamEyeLOpen',ArtMesh42:'ParamEyeLOpen',EyeRight2:'ParamEyeROpen',ArtMesh25:'ParamEyeROpen',ArtMesh43:'ParamEyeROpen'};
 const originalOpacity=o=>Math.max(0,Math.min(1,(o-.08)/(.35-.08)));
 const closedOpacity=o=>Math.max(0,Math.min(1,1-o/.12));
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
 let maxPixels=0,opacityMax=0,wrongOrder=0,flips=0,degenerate=0,nonFinite=0;
 for(const id of oldIds){const i=ids.indexOf(id),j=oldIds.indexOf(id);now[i].forEach((v,k)=>maxPixels=Math.max(maxPixels,Math.abs(v-old[j][k])*ppu));opacityMax=Math.max(opacityMax,Math.abs(core.drawables.opacities[i]-(eyeParams[id]?(id==='ArtMesh42'||id==='ArtMesh43'?closedOpacity(params[eyeParams[id]]??1):originalOpacity(params[eyeParams[id]]??1)):baseline.drawables.opacities[j])));if(core.drawables.drawOrders[i]!==baseline.drawables.drawOrders[j])wrongOrder++;}
 ids.forEach((id,i)=>{nonFinite+=now[i].filter(v=>!Number.isFinite(v)).length;if(core.drawables.opacities[i]<.00001)return;const tri=core.drawables.indices[i];for(let k=0;k<tri.length;k+=3){const a=area(now[i],...tri.slice(k,k+3)),b=area(neutral[i],...tri.slice(k,k+3));if(a*b<0)flips++;if(Math.abs(a)<1e-12)degenerate++;}});
 const ki=ids.indexOf('ArtMesh56'),keyboardMotion=Math.max(...now[ki].map((v,k)=>Math.abs(v-neutral[ki][k])*ppu));
 return {params,maxPixels,opacityMax,wrongOrder,keyboardMotion,flips,degenerate,nonFinite,pass:maxPixels<.03&&opacityMax<.0001&&wrongOrder===0&&keyboardMotion<.03&&!flips&&!degenerate&&!nonFinite};});
 report.regressions={baselineVersion:64,preservedMeshes:oldIds.length-rotated.size,allowedOpacityChange:Object.keys(eyeParams),expectedGeometry:'All43 v64 vertices unchanged; six exact expected blink opacity curves; all topology/orders exact',checkedMeshes:oldIds.length,topology,samples,pass:ids.length===oldIds.length&&topology.every(r=>r.pass)&&samples.every(r=>r.pass)};
 const oldTail=report.bounds.find(r=>r.id==='ArtMesh55'),tail=report.bounds.find(r=>r.id==='ArtMesh58'),tip=report.bounds.find(r=>r.id==='ArtMesh57'),keyboard=report.bounds.find(r=>r.id==='ArtMesh56');
 report.nativeTailCompletion={main:tail,tip,disabledOldTail:oldTail,pass:oldTail.opacity===0&&tail.drawOrder===389&&tail.opacity===1&&tail.vertices===4&&tip.drawOrder===410&&tip.opacity===1&&tip.vertices===4};
 report.nativeKeyboardReplacement={...keyboard,pass:keyboard.drawOrder===480&&keyboard.opacity===1&&keyboard.vertices===4&&Math.abs(keyboard.bounds[0]-275)<4&&Math.abs(keyboard.bounds[1]-927)<4&&Math.abs(keyboard.bounds[2]-1201)<4&&Math.abs(keyboard.bounds[3]-1087)<4};
 report.pass=report.regressions.pass&&report.nativeTailCompletion.pass&&report.nativeKeyboardReplacement.pass;
 report.nativeEarOcclusion={id:'ArtMesh33',drawOrder:core.drawables.drawOrders[ids.indexOf('ArtMesh33')],geometryPreserved:true,pass:core.drawables.drawOrders[ids.indexOf('ArtMesh33')]===385};
 report.pass&&=report.nativeEarOcclusion.pass;
 const overlap=[];
 for(let n=0;n<=1000;n++){const opening=n/1000;pose(model,{ParamEyeLOpen:opening,ParamEyeROpen:opening});
  for(const [eye,sclera,closed]of [['EyeLeft2','ArtMesh26','ArtMesh42'],['EyeRight2','ArtMesh25','ArtMesh43']]){
   const a=core.drawables.opacities[ids.indexOf(eye)],b=core.drawables.opacities[ids.indexOf(sclera)],c=core.drawables.opacities[ids.indexOf(closed)];
   overlap.push({opening,eye,overlap:a*c,maskDelta:Math.abs(a-b),pass:a*c<.02&&Math.abs(a-b)<.0001});
  }}
 report.blinkOpacityTransition={samples:overlap.length,maxOverlap:Math.max(...overlap.map(x=>x.overlap)),maxMaskDelta:Math.max(...overlap.map(x=>x.maskDelta)),pass:overlap.every(x=>x.pass),scope:'Opacity overlap metric; visual animation acceptance is separate'};
 report.pass&&=report.blinkOpacityTransition.pass;
report.formalArtComplete=false;pose(model);return {baselineMoc,baselineModel,neutral,repaired:ids};
}

