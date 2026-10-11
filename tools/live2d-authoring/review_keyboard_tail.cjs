// Render actual official Core geometry on dark/light backgrounds; no preview overrides.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const version=Number(process.argv[2]||57);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{const page=await browser.newPage({viewport:{width:2600,height:1300}});
 await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`);
 await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
 await page.addStyleTag({content:'.stage{width:1254px;height:1254px;background:#172730}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}'});
 const folder=path.join(__dirname,`build/keyboard-tail-v${version}-20261008`);await fs.mkdir(folder,{recursive:true});
 const states=[{},...[-1,1].map(ParamSideHairLeftSway=>({ParamSideHairLeftSway})),...[-11,11].map(ParamAngleZ=>({ParamAngleZ})),...[-17,17].map(ParamAngleX=>({ParamAngleX})),{ParamHandLeftPress:30},{ParamHandRightPress:30},{ParamHandLeftPress:30,ParamHandRightPress:30},...[-.12,.12].map(ParamSideHairLeftSway=>({ParamSideHairLeftSway}))];
 const samples=[];for(let i=0;i<states.length;i++){await page.evaluate(p=>window.referenceRepair.setPose(p),states[i]);await page.waitForTimeout(120);
 await page.screenshot({path:path.join(folder,`tail-${i}.png`),clip:{x:1274,y:750,width:240,height:205}});
 await page.screenshot({path:path.join(folder,`keyboard-${i}.png`),clip:{x:1274+255,y:900,width:970,height:205}});
 samples.push({params:states[i],meshes:await page.evaluate(({p,v})=>(v>=58?['ArtMesh31','ArtMesh55','ArtMesh56','ArtMesh57','ArtMesh58']:['ArtMesh31','ArtMesh55','ArtMesh56']).map(id=>window.referenceRepair.meshGeometry(id,p)),{p:states[i],v:version})});}
 await page.evaluate(()=>window.referenceRepair.setPose({}));await page.waitForTimeout(120);
 await page.screenshot({path:path.join(folder,'neutral-dark.png'),clip:{x:1274,y:0,width:1254,height:1254}});
 await fs.writeFile(path.join(folder,'visual-review.json'),JSON.stringify({version,scope:'Official model pose screenshots; visual inspection still required',samples},null,2)+'\n');
 console.log(folder);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});

