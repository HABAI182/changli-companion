// Inspect real App/SDK output after real browser inputs; never inject poses.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../..'),version=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version,folder=path.join(__dirname,`build/interactions-${version}-20261011`);
 await fs.mkdir(folder,{recursive:true});
 const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const page=await b.newPage({viewport:{width:1100,height:950},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:1420/');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready');
  await page.addStyleTag({content:'.pet-wrap{width:627px!important}'});
  await page.evaluate(async()=>{const {CubismBackend}=await import('/src/renderer/live2d/CubismBackend.ts');const original=CubismBackend.prototype.setParameter;CubismBackend.prototype.setParameter=function(id,v){window.qaBackend=this;return original.call(this,id,v);};});
  await page.waitForFunction(()=>window.qaBackend);
  const read=()=>page.evaluate(()=>({p:window.qaBackend.getParameterSnapshot(),g:window.qaBackend.getDrawableSnapshot(),gestures:Object.fromEntries(window.qaBackend.parameters),contours:window.qaBackend.getContourSnapshot(),order:window.qaBackend.getDrawOrderSnapshot(),mouse:window.qaBackend.getMouseMotionSnapshot()}));
  const focus=()=>page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});
  const canvas=page.locator('canvas.live2d-canvas');
  await page.waitForTimeout(1000);await canvas.screenshot({path:path.join(folder,'rest.png')});const rest=await read();
  const samples=[];await focus();await page.keyboard.press('z');
  for(let i=0;i<30;i++){await page.waitForTimeout(25);samples.push(await read());if([3,10,25].includes(i))await canvas.screenshot({path:path.join(folder,`elastic-${i}.png`)});}
  const range=name=>{const v=samples.map(s=>s.gestures['__gesture.'+name]);return [Math.min(...v),Math.max(...v)];};
  const shape=range('headShape'),y=range('headY');
  const head={shape,y,headMoved:samples.some(s=>s.g.ArtMesh41.positions.some((v,i)=>Math.abs(v-rest.g.ArtMesh41.positions[i])>8)),keyboardStatic:samples.every(s=>s.g.ArtMesh56.positions.every((v,i)=>Math.abs(v-rest.g.ArtMesh56.positions[i])<.001))};
  head.pass=shape[0]<-.02&&shape[1]>.2&&head.headMoved&&head.keyboardStatic;
  const hands=[];
  for(const key of ['z','u','Space']){await page.waitForTimeout(900);const before=await read();await focus();await page.keyboard.press(key);await page.waitForTimeout(100);const s=await read(),dx=s.g.ArtMesh9.positions[0]-before.g.ArtMesh9.positions[0];hands.push({key,dx,pass:(key==='z'?dx<-35:key==='u'?dx>35:Math.abs(dx)<.1)&&s.p.ParamHandRightPress>10&&s.p.ParamHandLeftPress===0&&s.order.ArtMesh9>s.order.ArtMesh34});await canvas.screenshot({path:path.join(folder,`key-${key}.png`)});}
  const mouse=[];for(const button of ['left','right']){await page.waitForTimeout(800);await page.mouse.click(10,20,{button});await page.waitForTimeout(85);const s=await read();mouse.push({button,press:s.p.ParamHandLeftPress,other:s.p.ParamHandRightPress,pass:s.p.ParamHandLeftPress>1&&s.p.ParamHandRightPress===0});}
  await page.waitForTimeout(800);const a=await read();await page.waitForTimeout(280);const c=await read();
  const bird={wingDelta:Math.abs(c.p.ParamPhoenixWingSway-a.p.ParamPhoenixWingSway),tailDelta:Math.abs(c.p.ParamPhoenixTailSway-a.p.ParamPhoenixTailSway),bodyDelta:Math.abs(c.g.ArtMesh50.positions[1]-a.g.ArtMesh50.positions[1]),flameStrength:c.gestures['__gesture.flameStrength']};bird.pass=bird.wingDelta>1&&bird.tailDelta>1&&bird.bodyDelta>.2&&bird.flameStrength>0;
  const handle=page.locator('.drag-handle'),box=await handle.boundingBox(),cb=await canvas.boundingBox();const handleLocation={right:box.x+box.width<cb.x+cb.width+1,xRatio:(box.x-cb.x)/cb.width,yRatio:(box.y-cb.y)/cb.height};handleLocation.pass=handleLocation.right&&handleLocation.xRatio>.9&&handleLocation.yRatio>.7&&handleLocation.yRatio<.85;
  await page.waitForTimeout(1000);const preDrag=await read();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-70,box.y-50,{steps:6});await page.waitForTimeout(150);const drag=await read();await canvas.screenshot({path:path.join(folder,'drag-head.png')});await page.mouse.up();await page.waitForTimeout(1800);const settled=await read();
  const dragCheck={handsStay:Math.abs(drag.g.ArtMesh9.positions[1]-preDrag.g.ArtMesh9.positions[1])<.1&&Math.abs(drag.g.ArtMesh10.positions[1]-preDrag.g.ArtMesh10.positions[1])<.1,settledShape:settled.gestures['__gesture.headShape']};dragCheck.pass=dragCheck.handsStay&&Math.abs(dragCheck.settledShape)<.1;
  const contour=settled.contours;const contourPass=contour.ArtMesh9.renderedVertices>4&&contour.ArtMesh10.renderedVertices>4;
  const files=['src/pet/ElasticSpring.ts','src/pet/presentation.ts','src/renderer/live2d/ContourMesh.ts','src/renderer/live2d/MouseRegionRenderer.ts','src/renderer/live2d/RuntimeOffsets.ts','src/renderer/live2d/CubismBackend.ts','src/renderer/live2d/Live2DAdapter.ts','src/settings/SettingsPanel.tsx','src/style.css','src-tauri/src/windows.rs','src-tauri/src/desktop.rs','public/models/changli/model.json'];
  const sourceSha256=Object.fromEntries(await Promise.all(files.map(async f=>[f,crypto.createHash('sha256').update(await fs.readFile(path.join(root,f))).digest('hex').toUpperCase()])));
  const report={appVersion:version,webglRendered:true,windowsDesktopVerified:false,formalArtComplete:false,head,hands,mouse,bird,handleLocation,dragCheck,contour,contourPass,sourceSha256,errors};report.pass=head.pass&&hands.every(x=>x.pass)&&mouse.every(x=>x.pass)&&bird.pass&&handleLocation.pass&&dragCheck.pass&&contourPass&&!errors.length;
  await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
