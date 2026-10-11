// Exercise the actual App, read real post-render Core geometry, and capture
// visible expressions. No model parameter injection or fixture-only renderer.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'build/interactions-0.7.1-20261011');
 await fs.mkdir(folder,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:2}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:1420/');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready',null,{timeout:25000});
  await page.evaluate(async()=>{
   const {CubismBackend}=await import('/src/renderer/live2d/CubismBackend.ts');
   const original=CubismBackend.prototype.setParameter;
   window.gestureQa={backend:null,updates:0};
   CubismBackend.prototype.setParameter=function(id,value){window.gestureQa.backend=this;if(id==='ParamEyeLOpen')window.gestureQa.updates++;return original.call(this,id,value);};
  });
  await page.waitForFunction(()=>window.gestureQa.backend);
  const read=()=>page.evaluate(()=>({p:window.gestureQa.backend.getParameterSnapshot(),g:window.gestureQa.backend.getDrawableSnapshot(),mouse:window.gestureQa.backend.getMouseMotionSnapshot()}));
  const focus=()=>page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});
  const canvas=page.locator('canvas.live2d-canvas');
  const hands=[];
  for(const key of ['q','a','z','1','u','l','m','9','Space']) {
   await page.waitForTimeout(800); const before=await read();await focus();await page.keyboard.press(key);await page.waitForTimeout(110);
   const after=await read(),leftDx=after.g.ArtMesh10.positions[0]-before.g.ArtMesh10.positions[0],rightDx=after.g.ArtMesh9.positions[0]-before.g.ArtMesh9.positions[0];
   const zone=['q','a','z','1'].includes(key)?'left':key==='Space'?'center':'right';
   const pass=after.p.ParamHandRightPress>10&&after.p.ParamHandLeftPress===0&&Math.abs(leftDx)<.1&&
    (zone==='left'?rightDx<-35:zone==='right'?rightDx>35:Math.abs(rightDx)<.1);
   hands.push({key,zone,leftPress:after.p.ParamHandLeftPress,rightPress:after.p.ParamHandRightPress,leftDx,rightDx,pass});
   await canvas.screenshot({path:path.join(folder,`key-${key}.png`)});
  }
  await page.waitForTimeout(800);const neutral=await read();
  await page.mouse.move(10,20);await page.waitForTimeout(210);const mouse=await read();
  const mouseDx=mouse.g.ArtMesh10.positions[0]-neutral.g.ArtMesh10.positions[0];
  await canvas.screenshot({path:path.join(folder,'mouse-move.png')});
  await page.waitForTimeout(1100);const rested=await read();
  const restDx=rested.g.ArtMesh10.positions[0]-neutral.g.ArtMesh10.positions[0];
  let leftPeak=0,rightPeak=0,bothPressed=false;
  await focus();for(let i=0;i<10;i++){await page.keyboard.press(i%2?'l':'a');await page.waitForTimeout(45);const s=await read();leftPeak=Math.max(leftPeak,s.p.ParamHandLeftPress);rightPeak=Math.max(rightPeak,s.p.ParamHandRightPress);bothPressed||=s.p.ParamHandLeftPress>.01&&s.p.ParamHandRightPress>.01;}
  await page.waitForTimeout(800);const rapidRest=await read();
  const rapid={leftPeak,rightPeak,bothPressed,pass:leftPeak===0&&rightPeak>3&&!bothPressed&&rapidRest.p.ParamHandLeftPress===0&&rapidRest.p.ParamHandRightPress===0};
  const mouseRegionPass=mouse.mouse&&Math.abs(mouse.mouse.mouseDelta[0]-mouseDx)<.01&&
   mouse.mouse.staticDelta.every(v=>Math.abs(v)<.001)&&
   mouse.g.ArtMesh20.positions.every((v,i)=>v===neutral.g.ArtMesh20.positions[i]);
  const appVersion=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
  const files=['src/App.tsx','src/model.ts','src/native.ts','src/pet/presentation.ts',
   'src/renderer/live2d/RuntimeOffsets.ts','src/renderer/live2d/MouseRegionRenderer.ts','src/renderer/live2d/MouseMesh.ts',
   'src/renderer/live2d/CubismBackend.ts','src/renderer/live2d/Live2DAdapter.ts',
   'src/renderer/layered/layerMotion.ts','public/models/changli/model.json'];
  const sourceSha256=Object.fromEntries(await Promise.all(files.map(async file=>[file,
   crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex').toUpperCase()])));
  const report={appVersion,browser:true,windowsDesktopVerified:false,formalArtComplete:false,
   scope:'Actual App: increased keyboard reach; rendered mouse/cable partition follows mouse hand while native source/keyboard/body remain unchanged.',
   hands,mouse:{handDx:mouseDx,drawn:mouse.mouse,restDx,
    pass:Math.abs(mouseDx)>8&&Math.abs(restDx)<.05&&mouseRegionPass},rapid,sourceSha256,errors};
  report.pass=hands.every(h=>h.pass)&&report.mouse.pass&&rapid.pass&&errors.length===0;
  await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
