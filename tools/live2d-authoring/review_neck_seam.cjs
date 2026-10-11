// Read-only Core geometry/crops for the neck base and actual desktop ranges.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const version=Number(process.argv[2]||55);
const earBehind=process.argv.includes('--ear-behind');
const shoulderFill=process.argv.includes('--shoulder-fill');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2600,height:1300}});
  await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`);
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
  await page.addStyleTag({content:'.stage{width:1254px;height:1254px;background:#172730}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}'});
  const folder=path.join(__dirname,`build/neck-seam-v${version}${earBehind?'-ear-behind':''}${shoulderFill?'-shoulder-fill':''}-20261008`);await fs.mkdir(folder,{recursive:true});
  const states=[{},...[-17,17].map(ParamAngleX=>({ParamAngleX})),...[-6,6].map(ParamAngleY=>({ParamAngleY})),...[-11,11].map(ParamAngleZ=>({ParamAngleZ})),{ParamAngleX:8,ParamAngleY:6,ParamAngleZ:4}];
  const samples=[];
  for(let i=0;i<states.length;i++){
   const params=states[i];await page.evaluate(p=>window.referenceRepair.setPose(p),params);await page.waitForTimeout(120);
   if(earBehind){await page.evaluate(()=>window.referenceRepair.previewLayerOrder({ArtMesh33:385}));await page.waitForTimeout(60);}
   if(shoulderFill){await page.evaluate(()=>window.referenceRepair.previewMeshSourceVertices('ArtMesh53',{2:[346,890],3:[165,890]}));await page.waitForTimeout(60);}
   samples.push({params,meshes:await page.evaluate(p=>['ArtMesh34','ArtMesh20','ArtMesh9','ArtMesh10'].map(id=>window.referenceRepair.meshGeometry(id,p)),params)});
   await page.screenshot({path:path.join(folder,`pose-${i}.png`),clip:{x:1274+180,y:780,width:710,height:205}});
   await page.screenshot({path:path.join(folder,`ear-${i}.png`),clip:{x:1274+160,y:650,width:300,height:310}});
  }
  await fs.writeFile(path.join(folder,'seams.json'),JSON.stringify({version,scope:'Read-only native model neck/base investigation, not final art acceptance',samples},null,2)+'\n');
  console.log('Saved neck/base crops and exact Core vertices for eight real desktop poses.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
