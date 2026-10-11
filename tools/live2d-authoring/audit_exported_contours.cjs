// Read-only silhouettes from the official MOC3. No texture/mesh editing.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const version=Number(process.argv[2]||35);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2600,height:1300}});
  await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`);
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
  await page.addStyleTag({content:'.stage{width:1254px;height:1254px;background:#172730}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}'});
  const folder=path.join(__dirname,`build/contour-audit-v${version}-20261006`);await fs.mkdir(folder,{recursive:true});
  const poses={neutral:{},leftHair:{ParamSideHairLeftSway:15},rightHair:{ParamSideHairRightSway:-15},headTilt:{ParamAngleZ:11},headExtremeLeft:{ParamAngleZ:-30},headExtremeRight:{ParamAngleZ:30}};
  if(version>=46)Object.assign(poses,{headLeft:{ParamAngleX:-30},headRight:{ParamAngleX:30},headUp:{ParamAngleY:30},headDown:{ParamAngleY:-30},headCombined:{ParamAngleX:30,ParamAngleY:30,ParamAngleZ:30}});
  for(const [name,params] of Object.entries(poses)){
   await page.evaluate(params=>window.referenceRepair.setPose(params),params);await page.waitForTimeout(60);
   await page.screenshot({path:path.join(folder,`${name}-dark.png`),clip:{x:1274,y:0,width:1254,height:1254}});
  }
  await page.evaluate(()=>{window.referenceRepair.setPose({});window.referenceRepair.renderOnly(['ArtMesh31']);});
  await page.screenshot({path:path.join(folder,'left-feathers-isolated-dark.png'),clip:{x:1274,y:570,width:430,height:405}});
  for(const id of ['ArtMesh18','ArtMesh38','ArtMesh3','ArtMesh4']){
   await page.evaluate(id=>{window.referenceRepair.setPose({});window.referenceRepair.renderOnly([id]);},id);
   await page.screenshot({path:path.join(folder,`${id}-isolated-dark.png`),clip:{x:1274,y:0,width:1254,height:1000}});
  }
  const report={scope:'Read-only visual contour inspection; no artistic pass inferred from screenshot generation',version,browser:true,formalArtComplete:false,isolated:['ArtMesh31'],poses:Object.keys(poses).length};
  const meshes=await page.evaluate(()=>['ArtMesh38','ArtMesh40'].map(id=>window.referenceRepair.meshGeometry(id)));
  for(const mesh of meshes){
   const counts=new Map();for(let k=0;k<mesh.indices.length;k+=3){const tri=mesh.indices.slice(k,k+3);for(let a=0;a<3;a++){const e=[tri[a],tri[(a+1)%3]].sort((a,b)=>a-b).join(',');counts.set(e,(counts.get(e)||0)+1);}}
   mesh.boundary=Array.from(new Set([...counts].filter(([,n])=>n===1).flatMap(([e])=>e.split(',').map(Number)))).sort((a,b)=>a-b).map(i=>({index:i,x:mesh.vertices[i][0],y:mesh.vertices[i][1]}));
  }
  await fs.writeFile(path.join(folder,'mesh-boundaries.json'),JSON.stringify(meshes,null,2)+'\n');
  await fs.writeFile(path.join(folder,'audit-scope.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
