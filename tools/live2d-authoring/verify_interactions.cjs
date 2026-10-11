// Exercise the actual App, read real post-render Core geometry, and capture
// visible expressions. No model parameter injection or fixture-only renderer.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'build/interactions-0.7.0-20261011');
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
  const read=()=>page.evaluate(()=>({p:window.gestureQa.backend.getParameterSnapshot(),g:window.gestureQa.backend.getDrawableSnapshot()}));
  const focus=()=>page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});
  const canvas=page.locator('canvas.live2d-canvas');
  const hands=[];
  for(const key of ['q','a','z','1','u','l','m','9','Space']) {
   await page.waitForTimeout(800); const before=await read();await focus();await page.keyboard.press(key);await page.waitForTimeout(110);
   const after=await read(),leftDx=after.g.ArtMesh10.positions[0]-before.g.ArtMesh10.positions[0],rightDx=after.g.ArtMesh9.positions[0]-before.g.ArtMesh9.positions[0];
   const zone=['q','a','z','1'].includes(key)?'left':key==='Space'?'center':'right';
   const pass=after.p.ParamHandRightPress>10&&after.p.ParamHandLeftPress===0&&Math.abs(leftDx)<.1&&
    (zone==='left'?rightDx<-8:zone==='right'?rightDx>8:Math.abs(rightDx)<.1);
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
  const faces=[];
  for(const name of ['默认','开心','惊讶','困倦','思考','无语','认真','疑惑']) {
   await page.locator('.pet-wrap').click({button:'right'});
   if(['思考','无语','认真','疑惑'].includes(name))await page.locator('.pet-menu-more > summary').click();
   await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(650);
   const s=await read(),v=s.g.ArtMesh28.positions,x=v.filter((_,i)=>i%2===0),y=v.filter((_,i)=>i%2===1);
   faces.push({name,left:s.p.ParamEyeLOpen,right:s.p.ParamEyeROpen,mouthWidth:Math.max(...x)-Math.min(...x),mouthHeight:Math.max(...y)-Math.min(...y)});
   await canvas.screenshot({path:path.join(folder,`expression-${faces.length-1}.png`)});
  }
  const smile=faces[1],surprise=faces[2],sleepy=faces[3];
  const expressionsPass=smile.left===0&&surprise.left>.99&&sleepy.left>.1&&sleepy.left<.4&&surprise.mouthHeight>smile.mouthHeight*2;
  const bubbles=[];
  await page.waitForTimeout(2000);
  for(let i=0;i<3;i++){await page.getByRole('button',{name:'摸摸头',exact:true}).click();await page.waitForTimeout(80);bubbles.push(await page.locator('.pet-bubble').innerText());await page.waitForTimeout(1800);}
  await page.screenshot({path:path.join(folder,'bubble-main-app.png')});
  const bubblesPass=bubbles.every((v,i)=>!i||v!==bubbles[i-1]);
  await page.locator('.pet-wrap').click({button:'right'});await page.getByRole('button',{name:'默认',exact:true}).click();await page.waitForTimeout(500);
  const clock=await page.evaluate(async()=>{
   const qa=window.gestureQa,first=qa.updates,samples=[],start=performance.now();
   await new Promise(resolve=>{function observe(){const p=qa.backend.getParameterSnapshot();samples.push({t:performance.now()-start,left:p.ParamEyeLOpen,right:p.ParamEyeROpen,breath:p.ParamBreath});if(performance.now()-start<12000)requestAnimationFrame(observe);else resolve();}requestAnimationFrame(observe);});
   return {updates:qa.updates-first,samples,durationMs:performance.now()-start,status:JSON.parse(localStorage.getItem('changli-live2d-runtime-status'))};
  });
  const closed=clock.samples.filter(s=>s.left<=.01&&s.right<=.01),restored=closed.length>0&&clock.samples.some(s=>s.t>closed.at(-1).t&&s.left>.99&&s.right>.99);
  const clockPass=clock.updates>=180&&closed.length>0&&restored;
  const appVersion=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
  const sourceSha256=Object.fromEntries(await Promise.all(['src-tauri/src/model.rs','src/App.tsx','src/pet/presentation.ts','src/pet/responses.ts','src/model.ts','src/native.ts','src/renderer/layered/layerMotion.ts','src/settings/SettingsPanel.tsx','src/style.css','src/renderer/live2d/RuntimeOffsets.ts','src/renderer/live2d/Live2DRenderer.tsx','src/renderer/live2d/Live2DAdapter.ts','src/renderer/live2d/CubismBackend.ts','public/models/changli/model.json'].map(async file=>[file,crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex').toUpperCase()])));
  const manifest=JSON.parse(await fs.readFile(path.join(root,'public/models/changli/model.json'),'utf8'));
  const entry=path.join('public/models/changli',manifest.renderer.live2d.entry);
  const refs=JSON.parse(await fs.readFile(path.join(root,entry),'utf8')).FileReferences;
  for(const file of [entry,...refs.Expressions.filter(row=>row.Name.endsWith('Reaction')).map(row=>path.join(path.dirname(entry),row.File))])
   sourceSha256[file.replaceAll('\\','/')]=crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex').toUpperCase();
  const report={appVersion,browser:true,windowsDesktopVerified:false,formalArtComplete:false,scope:'Actual App/Core; all keyboard regions use the same character left hand (image-right ArtMesh9), moving left/right/center. Mouse uses the character right hand (image-left ArtMesh10). Procedural feedback, not new Cubism authored keys.',hands,mouse:{dx:mouseDx,restDx,pass:Math.abs(mouseDx)>2&&Math.abs(restDx)<.05},rapid,faces,expressionsPass,bubbles,bubblesPass,clock:{updates:clock.updates,closedFrames:closed.length,restored,pass:clockPass},sourceSha256,errors};
  report.pass=hands.every(h=>h.pass)&&report.mouse.pass&&rapid.pass&&expressionsPass&&bubblesPass&&clockPass&&errors.length===0;
  await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');
  const clockFolder=path.join(__dirname,'build/app-animation-clock-20261011');
  await fs.writeFile(path.join(clockFolder,'verification.json'),JSON.stringify({...clock,pass:clockPass,appVersion,sourceSha256,browser:true,windowsDesktopVerified:false},null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
