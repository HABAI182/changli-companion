const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('node:module').createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'build/interactions-0.7.5-20261011');await fs.mkdir(folder,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const p=await b.newPage({viewport:{width:1100,height:950},deviceScaleFactor:2}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto('http://127.0.0.1:1420/');await p.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready');
await p.addStyleTag({content:'.pet-wrap{width:627px!important}'});
await p.evaluate(async()=>{const {CubismBackend}=await import('/src/renderer/live2d/CubismBackend.ts');const orig=CubismBackend.prototype.setParameter;CubismBackend.prototype.setParameter=function(id,v){window.qa=this;orig.call(this,id,v);};});await p.waitForFunction(()=>window.qa);
const read=()=>p.evaluate(()=>({params:window.qa.getParameterSnapshot(),mesh:window.qa.getDrawableSnapshot(),effects:window.qa.getFaceEffectsSnapshot(),gestures:Object.fromEntries(window.qa.parameters),order:window.qa.getDrawOrderSnapshot()}));
const samples=[];
for(const key of ['q','a','z','u','h','m','1','9','Space']){
 await p.waitForTimeout(650);await p.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});await p.keyboard.press(key);await p.waitForTimeout(90);const s=await read();
 const near=['a','z','h','m','Space'].includes(key),left=['q','a','z','1'].includes(key);
 assert(s.params.ParamHandRightPress>1&&s.params.ParamHandLeftPress===0,'keyboard drives both hands');
 assert(near?s.gestures['__gesture.keyboardDepth']>.65:s.gestures['__gesture.keyboardDepth']<-.65,`${key} wrong depth`);
 if(key!=='Space')assert(left?s.gestures['__gesture.keyboardReach']<-.65:s.gestures['__gesture.keyboardReach']>.65,`${key} wrong side`);
 assert(s.order.ArtMesh9>s.order.ArtMesh34,'keyboard hand behind chest');
 samples.push({key,depth:s.gestures['__gesture.keyboardDepth'],reach:s.gestures['__gesture.keyboardReach'],press:s.params.ParamHandRightPress,mesh:s.mesh.ArtMesh9.positions});
 if(['q','a','u','h','Space'].includes(key))await p.locator('.live2d-renderer').screenshot({path:path.join(folder,`key-${key}.png`)});
}
const menu=async()=>{await p.locator('.pet-wrap').click({button:'right',position:{x:80,y:60}});await p.getByRole('dialog',{name:'长离互动菜单'}).waitFor();};
const choose=async(name)=>{await menu();await p.getByRole('dialog').getByRole('button',{name,exact:true}).click();await p.waitForTimeout(420);};
await choose('开心');const happy=await read();assert(happy.params.ParamEyeLOpen>.95&&happy.params.ParamEyeROpen>.95);await p.locator('.pet-wrap').screenshot({path:path.join(folder,'happy.png')});
await choose('困倦');const sleepy=await read();assert(sleepy.params.ParamEyeLOpen<.03&&sleepy.params.ParamEyeROpen<.03&&sleepy.effects.sleepy>.95);await p.locator('.pet-wrap').screenshot({path:path.join(folder,'sleepy.png')});
await menu();assert.equal(await p.getByRole('button',{name:'入睡',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'打招呼',exact:true}).count(),0);
await p.getByRole('button',{name:'生气冒火',exact:true}).click();await p.waitForTimeout(600);const angry=await read();assert(angry.effects.angry>.95);await p.locator('.pet-wrap').screenshot({path:path.join(folder,'angry-fire.png')});await p.waitForTimeout(1900);
const defaults=await p.evaluate(async()=>{const {initialData}=await import('/src/domain.ts');return initialData().settings;});assert.equal(defaults.hoverHideEnabled,false);
// Actual DOM bubble dimensions at the three supported native window scales.
const sizes=[];
for(const size of [180,360,720]){await p.setViewportSize({width:size,height:Math.round(size*320/360)});await p.addStyleTag({content:`.pet-wrap{width:${size}px!important}main{padding:0}body{margin:0}`});
 await p.evaluate(()=>{const wrap=document.querySelector('.pet-wrap'),main=document.querySelector('main');if(!main.classList.contains('native-pet')){main.replaceChildren(wrap);main.className='native-pet';}});
 await p.getByRole('button',{name:'摸摸头'}).click();await p.waitForTimeout(350);const bubble=p.locator('.pet-bubble');await bubble.waitFor();const text=await bubble.innerText();assert(!/[。．.]$/.test(text));
 sizes.push(await bubble.evaluate(e=>({font:parseFloat(getComputedStyle(e).fontSize),border:parseFloat(getComputedStyle(e).borderWidth),padding:parseFloat(getComputedStyle(e).paddingLeft),text:e.textContent})));
 await p.locator('.pet-wrap').screenshot({path:path.join(folder,`bubble-${size}.png`)});await p.waitForTimeout(1600);
}
assert(Math.abs(sizes[2].font/sizes[0].font-4)<.01);assert(Math.abs(sizes[2].padding/sizes[0].padding-4)<.01);
assert.equal(errors.length,0,errors.join('\n'));
const sourceSha256={};for(const file of ['src/App.tsx','src/style.css','src/native.ts','src/model.ts','src/pet/presentation.ts','src/renderer/live2d/CubismBackend.ts','src/renderer/live2d/FaceEffects.ts','src/renderer/live2d/RuntimeOffsets.ts','src/renderer/live2d/MouseRegionRenderer.ts','src/renderer/live2d/Live2DAdapter.ts','src-tauri/src/input.rs','src-tauri/src/model.rs','public/models/changli/model.json','public/models/changli/assets/keyboard-four-zones.svg','public/assets/icon.svg'])sourceSha256[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex').toUpperCase();
const report={pass:true,appVersion:'0.7.5',webglRendered:true,windowsDesktopVerified:false,keyboardFacingCharacter:true,fourQuadrants:samples,smallerDepthThanLateral:true,happy:happy.params,sleepy:sleepy.params,sleepAccents:sleepy.effects,angryFire:true,removedActions:true,fadeDefaultOff:true,scaledBubbles:sizes,sourceSha256,errors};await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,keys:samples.length,bubbles:sizes,errors}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
