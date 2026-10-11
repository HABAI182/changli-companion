// Read-only comparison of a newly official-exported source against runtime v64.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'public/vendor/live2d/live2dcubismcore.min.js');
const context={console,process,require,__dirname:path.dirname(file),__filename:file,Buffer,WebAssembly,TextEncoder,TextDecoder,setTimeout,clearTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync(file,'utf8'),context);
const Core=context.Live2DCubismCore,sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
(async()=>{
 for(let n=0;;n++){try{Core.Version.csmGetVersion();break;}catch(e){if(n>100)throw e;await new Promise(r=>setTimeout(r,10));}}
 const baselineFolder=path.join(root,'public/models/changli/live-reference-repair-v64-candidate');
 const exportFolder=path.join(__dirname,'build/editor-export-reference-repair-v65-20261006');
 const oldFile=path.join(baselineFolder,'ChangliReferenceRepairV64.moc3'),newFile=path.join(exportFolder,'ChangliReferenceRepairV65.moc3');
 const load=p=>{const b=fs.readFileSync(p),moc=Core.Moc.fromArrayBuffer(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));if(!moc)throw Error('Official Core rejected '+p);return {moc,model:Core.Model.fromMoc(moc)};};
 const old=load(oldFile),next=load(newFile),a=old.model,b=next.model,ids=[...a.drawables.ids],newIds=[...b.drawables.ids],ppu=a.canvasinfo.PixelsPerUnit;
 const same=(x,y)=>JSON.stringify([...x])===JSON.stringify([...y]);
 const params=[...a.parameters.ids];
 const paramMatch=same(params,b.parameters.ids)&&same(a.parameters.defaultValues,b.parameters.defaultValues)&&same(a.parameters.minimumValues,b.parameters.minimumValues)&&same(a.parameters.maximumValues,b.parameters.maximumValues);
 const topology=ids.map((id,i)=>{const j=newIds.indexOf(id);return {id,pass:j>=0&&same(a.drawables.vertexUvs[i],b.drawables.vertexUvs[j])&&same(a.drawables.indices[i],b.drawables.indices[j])&&same([...a.drawables.masks[i]].map(k=>ids[k]),[...b.drawables.masks[j]].map(k=>newIds[k]))&&a.drawables.textureIndices[i]===b.drawables.textureIndices[j]};});
 const states=[{}];for(let i=0;i<a.parameters.count;i++)for(const value of [a.parameters.minimumValues[i],a.parameters.maximumValues[i]])states.push({[params[i]]:value});
 for(let n=0;n<=100;n++)for(const z of [-30,0,30])states.push({ParamAngleZ:z,ParamEyeBallX:n/50-1,ParamEyeBallY:1-n/50,ParamEyeLOpen:n/100,ParamEyeROpen:1-n/100,ParamSideHairLeftSway:n/50-1,ParamBangCenterSway:1-n/50});
 for(const x of [-30,0,30])for(const y of [-30,0,30])for(const z of [-30,0,30])states.push({ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
 for(const sway of [-30,-15,0,15,30])for(const wing of [-30,0,30])for(const tail of [-30,0,30])states.push({ParamPhoenixSway:sway,ParamPhoenixWingSway:wing,ParamPhoenixTailSway:tail});
 for(const s of [-1,0,1])for(const x of [-30,0,30])for(const y of [-30,0,30])for(const z of [-30,0,30])states.push({ParamOrnamentLeftSway:s,ParamAngleX:x,ParamAngleY:y,ParamAngleZ:z});
 const set=(model,values)=>{model.parameters.values.set(model.parameters.defaultValues);for(const [id,value]of Object.entries(values)){const i=model.parameters.ids.indexOf(id);if(i>=0)model.parameters.values[i]=value;}model.update();};
 const changed=new Map(),samples=[];
 for(const values of states){set(a,values);set(b,values);let maxPixels=0,opacityMax=0,orderDifferences=0;
  for(const [i,id]of ids.entries()){
   const j=newIds.indexOf(id);if(j<0){changed.set(id,{missing:true});continue;}
   const av=a.drawables.vertexPositions[i],bv=b.drawables.vertexPositions[j];let delta=av.length===bv.length?0:Infinity;
   if(av.length===bv.length)for(let k=0;k<av.length;k++)delta=Math.max(delta,Math.abs(av[k]-bv[k])*ppu);
   const opacity=Math.abs(a.drawables.opacities[i]-b.drawables.opacities[j]),order=a.drawables.drawOrders[i]!==b.drawables.drawOrders[j];
   maxPixels=Math.max(maxPixels,delta);opacityMax=Math.max(opacityMax,opacity);orderDifferences+=Number(order);
   if(delta>.03||opacity>.0001||order){const previous=changed.get(id)||{maxPixels:0,opacityMax:0,orderChanged:false};changed.set(id,{maxPixels:Math.max(previous.maxPixels,delta),opacityMax:Math.max(previous.opacityMax,opacity),orderChanged:previous.orderChanged||order});}
  }
  samples.push({values,maxPixels,opacityMax,orderDifferences,pass:maxPixels<.03&&opacityMax<.0001&&!orderDifferences});
 }
 const oldPhysics=JSON.parse(fs.readFileSync(path.join(baselineFolder,'ChangliReferenceRepairV64.physics3.json'),'utf8'));
 const newPhysics=JSON.parse(fs.readFileSync(path.join(exportFolder,'ChangliReferenceRepairV65.physics3.json'),'utf8'));
 const physicsIdentical=JSON.stringify(oldPhysics)===JSON.stringify(newPhysics);
 const report={officialCore:true,sourceVersion:65,baselineVersion:64,sourceSha256:sha(path.join(__dirname,'ChangliReferenceRepair-v65-candidate.cmo3')),
  baselineMocSha256:sha(oldFile),newMocSha256:sha(newFile),meshes:[ids.length,newIds.length],parameters:[a.parameters.count,b.parameters.count],parameterDefinitionsIdentical:paramMatch,
  topology,physicsIdentical,sampledPoses:samples.length,changedMeshes:Object.fromEntries(changed),samples,formalArtComplete:false};
 report.geometryEquivalent=ids.length===newIds.length&&paramMatch&&topology.every(s=>s.pass)&&samples.every(s=>s.pass);
 report.pass=report.geometryEquivalent&&physicsIdentical;
 const folder=path.join(__dirname,'build/source-audit-v65-20261009');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'core-comparison.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,samples:undefined,topology:undefined},null,2));a.release();b.release();old.moc._release();next.moc._release();
 if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1});
