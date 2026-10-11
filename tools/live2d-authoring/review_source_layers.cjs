// Read-only isolation of the official model to locate legacy edges precisely.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const version=Number(process.argv[2]||55);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2600,height:1300}});
  await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`);
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
  await page.addStyleTag({content:'.stage{width:1254px;height:1254px;background:#172730}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}'});
  const folder=path.join(__dirname,`build/source-layer-review-v${version}`);await fs.mkdir(folder,{recursive:true});
  const ids=['ArtMesh20','ArtMesh33','ArtMesh34','ArtMesh9','ArtMesh10','ArtMesh29','ArtMesh41'];
  const report=await page.evaluate(ids=>({bounds:window.referenceRepair.report.bounds,meshes:ids.map(id=>window.referenceRepair.meshGeometry(id))}),ids);
  await fs.writeFile(path.join(folder,'layers.json'),JSON.stringify(report,null,2)+'\n');
  for(const id of ids){
   await page.evaluate(id=>{window.referenceRepair.setPose({});window.referenceRepair.renderOnly([id]);},id);
   await page.waitForTimeout(100);
   await page.evaluate(id=>window.referenceRepair.renderOnly([id]),id);
   await page.waitForTimeout(50);
   await page.screenshot({path:path.join(folder,`${id}.png`),clip:{x:1274,y:0,width:1254,height:1254}});
  }
  console.log('Saved official model source-layer isolation; no art or assets changed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
