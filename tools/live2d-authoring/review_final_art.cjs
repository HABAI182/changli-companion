// Read-only official Core rendering of usable desktop poses and source meshes.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const version=Number(process.argv[2]||52);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2600,height:1300}});
  await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`);
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
  await page.addStyleTag({content:'.stage{width:1254px;height:1254px;background:#172730}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}'});
  const folder=path.join(__dirname,`build/art-review-v${version}-20261007`);await fs.mkdir(folder,{recursive:true});
  const poses={neutral:{},closed:{ParamEyeLOpen:0,ParamEyeROpen:0},half:{ParamEyeLOpen:.5,ParamEyeROpen:.5},
   leftWink:{ParamEyeLOpen:0},rightWink:{ParamEyeROpen:0},leftPress:{ParamHandLeftPress:30},rightPress:{ParamHandRightPress:30},
   gazeLeft:{ParamEyeBallX:-1,ParamAngleX:-8},gazeRight:{ParamEyeBallX:1,ParamAngleX:8},
   gazeUp:{ParamEyeBallY:1,ParamAngleY:6},gazeDown:{ParamEyeBallY:-1,ParamAngleY:-6},
   desktopCombined:{ParamAngleX:8,ParamAngleY:6,ParamAngleZ:4},
   runtimeCornerLeftUp:{ParamAngleX:-17,ParamAngleY:6,ParamAngleZ:-11,ParamEyeBallX:-1,ParamEyeBallY:1},
   runtimeCornerLeftDown:{ParamAngleX:-17,ParamAngleY:-6,ParamAngleZ:11,ParamEyeBallX:-1,ParamEyeBallY:-1},
   runtimeCornerRightUp:{ParamAngleX:17,ParamAngleY:6,ParamAngleZ:11,ParamEyeBallX:1,ParamEyeBallY:1},
   runtimeCornerRightDown:{ParamAngleX:17,ParamAngleY:-6,ParamAngleZ:-11,ParamEyeBallX:1,ParamEyeBallY:-1},
   pendantsLeft:{ParamOrnamentLeftSway:-1,ParamHairSide:-1},pendantsRight:{ParamOrnamentLeftSway:1,ParamHairSide:1},
   mouthOpen:{ParamMouthOpenY:1}};
  for(const [name,params] of Object.entries(poses)){
   await page.evaluate(params=>window.referenceRepair.setPose(params),params);await page.waitForTimeout(50);
   await page.screenshot({path:path.join(folder,`${name}-dark.png`),clip:{x:1274,y:0,width:1254,height:1254}});
  }
  const inspected=['ArtMesh48','ArtMesh38','ArtMesh40','ArtMesh18','ArtMesh3','ArtMesh31','ArtMesh52','ArtMesh53'];
  const meshes=await page.evaluate(ids=>ids.map(id=>window.referenceRepair.meshGeometry(id)),inspected);
  await fs.writeFile(path.join(folder,'mesh-geometry.json'),JSON.stringify(meshes,null,2)+'\n');
  for(const id of ['ArtMesh48','ArtMesh18']){
   await page.evaluate(id=>{window.referenceRepair.setPose({});window.referenceRepair.renderOnly([id]);},id);
   await page.screenshot({path:path.join(folder,`${id}-isolated-dark.png`),clip:{x:1274,y:0,width:1254,height:1254}});
  }
  const report={version,poses:Object.keys(poses),scope:'Official MOC3 visual review only; screenshot generation does not approve final art',formalArtComplete:false};
  await fs.writeFile(path.join(folder,'scope.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
