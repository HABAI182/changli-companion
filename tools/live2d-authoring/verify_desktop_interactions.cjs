// Observe the actual App's SDK rendering; no parameter injection.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'build/interactions-0.7.2-20261011');
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
   window.gestureQa={backend:null};
   CubismBackend.prototype.setParameter=function(id,value){window.gestureQa.backend=this;return original.call(this,id,value);};
  });
  await page.waitForFunction(()=>window.gestureQa.backend);
  const read=()=>page.evaluate(()=>({p:window.gestureQa.backend.getParameterSnapshot(),g:window.gestureQa.backend.getDrawableSnapshot(),order:window.gestureQa.backend.getDrawOrderSnapshot(),mouse:window.gestureQa.backend.getMouseMotionSnapshot()}));
  const focus=()=>page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});
  const canvas=page.locator('canvas.live2d-canvas');const hands=[];
  for(const key of ['q','a','z','1','u','l','m','9','Space']) {
   await page.waitForTimeout(750);const before=await read();await focus();await page.keyboard.press(key);await page.waitForTimeout(110);
   const s=await read(),dx=s.g.ArtMesh9.positions[0]-before.g.ArtMesh9.positions[0];
   const zone=['q','a','z','1'].includes(key)?'left':key==='Space'?'center':'right';
   hands.push({key,zone,dx,handRank:s.order.ArtMesh9,chestRank:s.order.ArtMesh34,
    pass:s.order.ArtMesh9>s.order.ArtMesh34&&s.order.ArtMesh10>s.order.ArtMesh34&&s.p.ParamHandRightPress>10&&s.p.ParamHandLeftPress===0&&
      (zone==='left'?dx<-35:zone==='right'?dx>35:Math.abs(dx)<.1)});
   if(['q','z','u'].includes(key))await canvas.screenshot({path:path.join(folder,`key-${key}.png`)});
  }
  const mouse=[];
  for(const button of ['left','right']) {
   await page.waitForTimeout(750);await page.mouse.click(12,20,{button});await page.waitForTimeout(85);
   const s=await read();mouse.push({button,press:s.p.ParamHandLeftPress,otherPress:s.p.ParamHandRightPress,
    pass:s.p.ParamHandLeftPress>(button==='left'?15:8)&&s.p.ParamHandLeftPress<(button==='left'?31:19)&&s.p.ParamHandRightPress===0});
   await canvas.screenshot({path:path.join(folder,`mouse-${button}.png`)});
  }
  await page.waitForTimeout(750);await page.mouse.wheel(0,160);await page.waitForTimeout(60);
  const wheel=await read();mouse.push({button:'wheel',press:wheel.p.ParamHandLeftPress,otherPress:wheel.p.ParamHandRightPress,
   pass:wheel.p.ParamHandLeftPress>1&&wheel.p.ParamHandLeftPress<9&&wheel.p.ParamHandRightPress===0});
  await page.waitForTimeout(750);const rest=await read();
  const handle=page.getByRole('button',{name:'拖动桌宠'});const box=await handle.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2-30,{steps:6});await page.waitForTimeout(220);
  const raised=await read();await canvas.screenshot({path:path.join(folder,'drag-lift.png')});await page.mouse.up();
  await page.waitForTimeout(1100);const landed=await read();
  const lift=(id)=>raised.g[id].positions[1]-rest.g[id].positions[1];
  const drag={mouseLift:lift('ArtMesh10'),keyboardLift:lift('ArtMesh9'),
   restingKeyboardDy:landed.g.ArtMesh9.positions[1]-rest.g.ArtMesh9.positions[1],
   restingMouseDy:landed.g.ArtMesh10.positions[1]-rest.g.ArtMesh10.positions[1]};
  drag.pass=drag.mouseLift>48&&drag.keyboardLift>48&&Math.abs(drag.restingKeyboardDy)<.2&&Math.abs(drag.restingMouseDy)<.2&&raised.p.ParamHandLeftPress===0&&raised.p.ParamHandRightPress===0;
  await canvas.screenshot({path:path.join(folder,'drag-landed.png')});
  await page.goto('http://127.0.0.1:1420/?panel=settings');
  await page.getByRole('switch',{name:'全屏自动避让'}).waitFor();
  const settingsUi={nativeOnlyDisabled:await page.getByRole('switch',{name:'全屏自动避让'}).isDisabled()&&await page.getByRole('switch',{name:'屏幕边缘磁吸'}).isDisabled(),
   positionsDisabled:await page.getByRole('button',{name:'保存位置1'}).isDisabled()};
  await page.screenshot({path:path.join(folder,'settings.png'),fullPage:true});
  const files=['src/App.tsx','src/domain.ts','src/model.ts','src/native.ts','src/pet/presentation.ts',
   'src/renderer/live2d/HandDrawOrder.ts','src/renderer/live2d/RuntimeOffsets.ts','src/renderer/live2d/MouseRegionRenderer.ts','src/renderer/live2d/MouseMesh.ts',
   'src/renderer/live2d/CubismBackend.ts','src/renderer/live2d/Live2DAdapter.ts','src/settings/SettingsPanel.tsx','src/settings/PositionPresets.tsx',
   'src-tauri/src/main.rs','src-tauri/src/desktop.rs','src-tauri/src/windows.rs','src-tauri/src/storage.rs','src-tauri/src/input.rs','public/models/changli/model.json'];
  const sourceSha256=Object.fromEntries(await Promise.all(files.map(async file=>[file,crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex').toUpperCase()])));
  const report={appVersion:'0.7.2',browser:true,windowsDesktopVerified:false,formalArtComplete:false,hands,mouse,drag,settingsUi,sourceSha256,errors};
  report.pass=hands.every(h=>h.pass)&&mouse.every(m=>m.pass)&&drag.pass&&Object.values(settingsUi).every(Boolean)&&!errors.length;
  await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
