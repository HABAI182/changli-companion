const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('node:module').createRequire(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'))('playwright');
(async()=>{
 const out=path.join(__dirname,'build/interactions-0.7.13-20261013'); await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const p=await browser.newPage({viewport:{width:1500,height:1080}}),errors=[]; p.setDefaultTimeout(7000); p.on('pageerror',e=>errors.push(String(e)));
  await p.goto('http://127.0.0.1:1420/');
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready');
  await p.evaluate(async()=>{
   const loaded=performance.getEntriesByType('resource').filter(e=>e.name.includes('/RuntimeOffsets.ts')).at(-1)?.name;
   const {RuntimeOffsets}=await import(loaded || '/src/renderer/live2d/RuntimeOffsets.ts'); const original=RuntimeOffsets.prototype.apply;
   RuntimeOffsets.prototype.apply=function(model,params){original.call(this,model,params);
    const core=model.getModel(),ppu=model.getPixelsPerUnit(),info=core.canvasinfo;
    const center=id=>{const i=core.drawables.ids.indexOf(id),v=model.getDrawableVertexPositions(i),xs=[],ys=[];
     for(let k=0;k<v.length;k+=2){xs.push(v[k]*ppu+info.CanvasOriginX);ys.push(info.CanvasOriginY-v[k+1]*ppu);}
     return {x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};};
    window.__bimanual={screenLeft:center('ArtMesh10'),screenRight:center('ArtMesh9'),params:Object.fromEntries(params)};
   };
  });
  const pet=p.locator('.pet-wrap');
  await p.waitForFunction(()=>window.__bimanual,null,{timeout:5000}); const neutral=await p.evaluate(()=>window.__bimanual);
  const cases=[];
  for(const [key,side] of [['Q','left-back'],['A','left-front'],['U','right-back'],['H','right-front'],['Space','space']]){
   await p.waitForTimeout(950); await p.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});
   await p.keyboard.press(key); await p.waitForTimeout(190);
   const frame=await p.evaluate(()=>window.__bimanual); cases.push({key,side,...frame});
   if(side.startsWith('left')) {assert(frame.screenRight.x>neutral.screenRight.x+70);assert(frame.params['__gesture.rightKeyboardMix']<0.05);}
   if(side.startsWith('right')) {assert(frame.screenLeft.x>neutral.screenLeft.x+90);assert(frame.params['__gesture.keyboardLanding']<0.05);assert(frame.params['__gesture.rightKeyboardMix']>0.8);}
   await pet.screenshot({path:path.join(out,side+'.png')});
  }
  await p.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'互动',exact:true}).click();
  const multi=p.getByRole('switch',{name:'同时显示多个按键'}); await multi.click();
  await p.waitForFunction(()=>document.querySelector('[aria-label="同时显示多个按键"]').checked);
  await p.evaluate(()=>document.body.focus()); await p.keyboard.press('Q');await p.keyboard.press('U');await p.keyboard.press('Space');
  assert.equal(await pet.locator('.key-badge').count(),3); await p.waitForTimeout(650);
  assert.equal(await pet.locator('.key-badge').count(),3); await pet.screenshot({path:path.join(out,'multi-key.png')});
  await p.waitForTimeout(1000); assert.equal(await pet.locator('.key-badge').count(),0);
  const speed=p.getByRole('slider',{name:'键盘手移动速度'}); assert.equal(await speed.inputValue(),'100');
  await speed.fill('50');await speed.dispatchEvent('pointerup');
  await p.waitForFunction(()=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')).json).settings.keyboardHandSpeed===0.5);
  assert.equal(await speed.inputValue(),'50');
  await multi.click();await p.waitForFunction(()=>!document.querySelector('[aria-label="同时显示多个按键"]').checked);
  await p.evaluate(()=>document.body.focus());await p.keyboard.press('Q');await p.keyboard.press('U');assert.equal(await pet.locator('.key-badge').count(),1);
  await p.getByRole('navigation',{name:'设置分类'}).screenshot({path:path.join(out,'settings-navigation.png')});
  await pet.click({button:'right'});const menu=p.getByRole('dialog',{name:'长离互动菜单'});await menu.waitFor();
  const before=await menu.boundingBox(),heading=await menu.locator('.pet-menu-heading b').boundingBox();
  await p.mouse.move(heading.x+10,heading.y+10);await p.mouse.down();await p.mouse.move(heading.x+55,heading.y+40,{steps:8});await p.mouse.up();
  const after=await menu.boundingBox();assert(Math.abs(after.x-before.x-45)<2);assert(Math.abs(after.y-before.y-30)<2);
  await p.mouse.click(2,2);await menu.waitFor({state:'hidden'});
  assert.equal(errors.length,0,errors.join('\n'));
  const report={pass:true,appVersion:'0.7.13',webglRendered:true,nativeWindowsHookVerified:false,neutral,cases,multiKeyBadgeCount:3,individualFade:true,speedSettingSaved:true,browserMenuOutsideDismissAndDrag:true,errors};
  await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,out,cases:cases.map(c=>({key:c.key,screenLeft:c.screenLeft,screenRight:c.screenRight}))}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
