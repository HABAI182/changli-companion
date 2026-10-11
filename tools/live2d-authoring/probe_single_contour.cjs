// Temporary, read-only rendered alternatives. Does not author or publish a model.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2600,height:1300}});
  await page.goto('http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v70-preview.html');
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
  await page.addStyleTag({content:'.stage{width:1254px;height:1254px;background:#172730}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}'});
  const folder=path.join(__dirname,'build/single-contour-probe-20261011');await fs.mkdir(folder,{recursive:true});
  for(const opening of [0,.02,.1,.133,.2,.3,.35]){
   await page.evaluate(o=>{const w=Math.max(0,1-o/.35);window.referenceRepair.setPose({ParamEyeLOpen:o,ParamEyeROpen:o});window.referenceRepair.previewTranslation({EyeLeft2:17/.652*w,ArtMesh26:17/.652*w,ArtMesh24:17/.652*w,EyeRight2:20/.652*w,ArtMesh25:20/.652*w,ArtMesh23:20/.652*w});},opening);
   await page.screenshot({path:path.join(folder,`opening-${opening}.png`),clip:{x:1554,y:570,width:570,height:260}});
  }
  await fs.writeFile(path.join(folder,'scope.json'),JSON.stringify({nativeAuthored:false,published:false,temporaryRenderOnly:true,visualAccepted:false}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
