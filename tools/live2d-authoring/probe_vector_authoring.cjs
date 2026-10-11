const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v44-preview.html');
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:30000});
  const report=await page.evaluate(async()=>{
   const bytes=await(await fetch('/tools/live2d-authoring/build/vector-authoring-inplace.moc3')).arrayBuffer();
   const consistency=Live2DCubismCore.Moc.prototype.hasMocConsistency(bytes)===1;
   const moc=Live2DCubismCore.Moc.fromArrayBuffer(bytes);
   if(!moc)return {consistency,pass:false};
   const model=Live2DCubismCore.Model.fromMoc(moc);model.update();
   const meshes=[...model.drawables.ids].map((id,i)=>({id,opacity:model.drawables.opacities[i],texture:model.drawables.textureIndices[i],uvs:[...model.drawables.vertexUvs[i]],indices:[...model.drawables.indices[i]],vertices:Array.from({length:model.drawables.vertexPositions[i].length/2},(_,k)=>[model.drawables.vertexPositions[i][k*2]*1254+627,-model.drawables.vertexPositions[i][k*2+1]*1254+627])}));
   const pass=consistency&&meshes.every(m=>m.vertices.every(v=>v.every(Number.isFinite)));
   model.release();moc._release();return {consistency,pass,meshes};
  });
  await fs.writeFile(path.join(__dirname,'build/vector-authoring-roundtrip.json'),JSON.stringify(report,null,2));
  console.log({pass:report.pass,consistency:report.consistency,meshes:report.meshes?.length});if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
