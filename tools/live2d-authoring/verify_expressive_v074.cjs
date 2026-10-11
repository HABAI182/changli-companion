// Exercise shipped controls and real Cubism WebGL, including vector overlays.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'build/expressive-0.7.4-20261011');await fs.mkdir(folder,{recursive:true});
 const config=JSON.parse(await fs.readFile(path.join(root,'public/models/changli/model.json'),'utf8'));
 const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const p=await b.newPage({viewport:{width:1200,height:950},deviceScaleFactor:2}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto('http://127.0.0.1:1420/');await p.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready');
  await p.addStyleTag({content:'.pet-wrap{width:627px!important}'});
  await p.evaluate(async()=>{const{CubismBackend}=await import('/src/renderer/live2d/CubismBackend.ts');const f=CubismBackend.prototype.setParameter;CubismBackend.prototype.setParameter=function(id,v){window.qa=this;f.call(this,id,v);};});
  await p.waitForFunction(()=>window.qa);
  const read=()=>p.evaluate(()=>({params:window.qa.getParameterSnapshot(),effects:window.qa.getFaceEffectsSnapshot(),gestures:Object.fromEntries(window.qa.parameters),drawables:window.qa.getDrawableSnapshot()}));
  const menu=async()=>{const box=await p.locator('.pet-wrap').boundingBox();await p.mouse.click(box.x+box.width*.98,box.y+box.height*.3,{button:'right'});await p.getByRole('dialog',{name:'长离互动菜单'}).waitFor();};
  const choose=async(name)=>{await menu();if(!['默认','开心','惊讶','困倦'].includes(name))await p.locator('.pet-menu-more summary').click();await p.getByRole('dialog').getByRole('button',{name,exact:true}).click();await p.waitForTimeout(420);};
  const faces=[];
  for(const e of config.expressions){await choose(e.name);const s=await read();await p.locator('.live2d-renderer').screenshot({path:path.join(folder,`face-${e.id}.png`)});faces.push({id:e.id,parameters:s.params,effects:s.effects});}
  for(const id of ['blush','wronged','angry','proud','phoenix_eyes','flame_eyes'])assert(faces.find(e=>e.id===id).effects[id]>.9,`${id} vector effect not rendered`);
  assert(faces.find(e=>e.id==='laugh').parameters.ParamEyeLOpen<.05);
  assert(faces.find(e=>e.id==='pout').parameters.ParamMouthForm<-.9);
  await choose('害羞');await p.mouse.move(20,30);await p.waitForTimeout(100);const aa=await read();await p.mouse.move(950,650);await p.waitForTimeout(150);const bb=await read();
  const overlayTracksHead=Math.abs(bb.gestures['__gesture.headX']-aa.gestures['__gesture.headX'])>.01;
  const actions=[];
  for(const a of config.animations){await choose('傲娇');await menu();await p.getByRole('button',{name:a.name,exact:true}).click();const values=[];
   for(let i=0;i<5;i++){await p.waitForTimeout(a.duration/7);values.push(await read());if(i===2)await p.locator('.live2d-renderer').screenshot({path:path.join(folder,`action-${a.id}.png`)});}
   await p.waitForTimeout(a.duration/2+300);const restored=await read();
   assert(restored.effects.proud>.95,`${a.id} did not restore selected face`);
   assert(Math.abs(restored.params.ParamHandLeftPress)<.01&&Math.abs(restored.params.ParamHandRightPress)<.01,'Hands remain depressed after action');
   const changed=values.some(s=>s.effects.proud<.6);assert(changed,`${a.id} action did not change face`);
   actions.push({id:a.id,expressionChanged:changed,restored:true,headRange:values.map(s=>s.gestures['__gesture.headY'])});
  }
  await p.getByRole('textbox',{name:'全屏避让例外'}).fill('GAME.exe, player.exe');await p.getByRole('textbox',{name:'全屏避让例外'}).press('Enter');await p.waitForTimeout(250);
  const exceptions=await p.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')).json).settings.fullscreenExceptions);
  assert.deepEqual(exceptions,['game.exe','player.exe']);await p.reload();await p.getByRole('textbox',{name:'全屏避让例外'}).waitFor();assert.equal(await p.getByRole('textbox',{name:'全屏避让例外'}).inputValue(),'game.exe, player.exe');
  await p.setViewportSize({width:360,height:320});await menu();await p.locator('.context-menu').screenshot({path:path.join(folder,'menu-360.png')});
  assert.equal(errors.length,0,errors.join('\n'));assert(overlayTracksHead);
  const report={pass:true,appVersion:'0.7.4',webglRendered:true,windowsDesktopVerified:false,nativeMocReauthored:false,formalArtComplete:false,faces,actions,overlayTracksHead,fullscreenExceptionPersistence:true,errors};
  await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,faces:faces.length,actions:actions.length,overlayTracksHead,errors}));
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
