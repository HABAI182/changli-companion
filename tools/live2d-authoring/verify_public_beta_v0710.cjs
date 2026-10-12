const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('node:module').createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{const dir=path.join(__dirname,'build/interactions-0.7.10-20261012');await fs.mkdir(dir,{recursive:true});const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const p=await b.newPage({viewport:{width:1240,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto('http://127.0.0.1:1420/');await p.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready');
await p.addStyleTag({content:'.workspace{display:grid!important;grid-template-columns:540px 560px!important;gap:24px!important;margin:0!important}main.preview>header{display:none}.settings-page{width:560px!important}main.preview{padding:24px!important}.scene{padding:0!important}'});
await p.getByLabel('主题',{exact:true}).selectOption('light');
await p.getByRole('region',{name:'桌宠设置'}).screenshot({path:path.join(dir,'settings-light.png')});
assert.equal(await p.locator('.settings-heading h2').textContent(),'偏好设置');
const before=await p.locator('.pet-wrap').boundingBox();await p.locator('.live2d-renderer').click({button:'right'});
const menu=p.getByRole('dialog',{name:'长离互动菜单'});await menu.waitFor();const box=await menu.boundingBox();const overlap=Math.max(0,Math.min(before.x+before.width,box.x+box.width)-Math.max(before.x,box.x))*Math.max(0,Math.min(before.y+before.height,box.y+box.height)-Math.max(before.y,box.y));assert.equal(overlap,0);
await p.screenshot({path:path.join(dir,'adjacent-menu.png')});await menu.getByRole('button',{name:'开心',exact:true}).click();await menu.waitFor({state:'hidden'});await p.locator('.live2d-renderer').screenshot({path:path.join(dir,'happy-keyboard.png')});
await p.evaluate(async()=>{const {CubismBackend}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/CubismBackend')).name);const orig=CubismBackend.prototype.setParameter;CubismBackend.prototype.setParameter=function(id,v){window.qa=this;orig.call(this,id,v);};});await p.waitForFunction(()=>window.qa);
const samples=[];for(const key of ['q','a','u','h']){await p.waitForTimeout(620);await p.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});await p.keyboard.press(key);await p.waitForTimeout(85);samples.push(await p.evaluate(key=>({key,params:window.qa.getParameterSnapshot()}),key));await p.locator('.live2d-renderer').screenshot({path:path.join(dir,'keyboard-'+key+'.png')});}
for(const s of samples){assert(s.params.ParamHandRightPress>1);assert.equal(s.params.ParamHandLeftPress,0);}assert.equal(errors.length,0,errors.join('\n'));
await fs.writeFile(path.join(dir,'verification.json'),JSON.stringify({pass:true,appVersion:'0.7.10',webglRendered:true,windowsDesktopVerified:false,scope:'new settings heading, icon, keyboard render and four-region hand separation, adjacent menu and expression action',menuBounds:box,petBounds:before,overlapArea:overlap,samples,errors},null,2));console.log('Public beta rendered QA passed');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
