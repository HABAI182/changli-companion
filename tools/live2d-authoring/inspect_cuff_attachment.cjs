// Read-only original-source sleeve/ear attachment evidence from official Core.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const version=Number(process.argv[2]||41);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2600,height:1300}});
  await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`);
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
  await page.addStyleTag({content:'.stage{width:1254px;height:1254px;background:#172730}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}'});
  const folder=path.join(__dirname,`build/cuff-attachment-v${version}-20261006`);await fs.mkdir(folder,{recursive:true});
  const report={version,scope:'Read-only attachment investigation; no repair or acceptance inferred',formalArtComplete:false,poses:[]};
  for(const angle of [-30,0,30]){
   await page.evaluate(angle=>window.referenceRepair.setPose({ParamAngleZ:angle}),angle);
   await page.waitForTimeout(60);
   const meshes=await page.evaluate(angle=>['ArtMesh33','ArtMesh34','ArtMesh10','ArtMesh9'].map(id=>window.referenceRepair.meshGeometry(id,{ParamAngleZ:angle})),angle);
   report.poses.push({angle,meshes});
   await page.screenshot({path:path.join(folder,`cuff-angle-${angle}.png`),clip:{x:1274+160,y:690,width:650,height:285}});
  }
  await fs.writeFile(path.join(folder,'attachment-geometry.json'),JSON.stringify(report,null,2)+'\n');console.log('Saved read-only cuff geometry and extreme pose crops');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
