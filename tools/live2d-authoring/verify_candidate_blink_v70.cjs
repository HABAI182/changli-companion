const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1320,height:820}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const offline=process.argv.includes('--offline');
  if(offline){
   const root=path.resolve(__dirname,'../..'),build=path.join(__dirname,'build/offline-input-blink');
   const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
   // Fulfil requests from project files inside Playwright, with no network sockets.
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!=='http://changli-offline.test')return route.abort();
    const rel=decodeURIComponent(url.pathname).slice(1);
    for(const base of [build,path.join(root,'public')]){
     const file=path.resolve(base,rel);if(!file.startsWith(base+path.sep))return route.abort();
     try{const body=await fs.readFile(file);return route.fulfill({status:200,body,contentType:types[path.extname(file)]||'application/octet-stream'});}catch{}
    }
    return route.fulfill({status:404,body:'Missing project resource'});
   });
  }
  await page.goto((offline?'http://changli-offline.test':'http://127.0.0.1:1420')+'/tools/live2d-authoring/input-blink-preview.html?candidate=70');
  await page.waitForFunction(()=>window.inputBlinkQa,null,{timeout:25000});
  const folder=path.join(__dirname,'build/input-blink-v70-20261011');await fs.mkdir(folder,{recursive:true});
  const report={officialSdk:true,browser:true,offlineProjectFiles:offline,windowsDesktopVerified:false,formalArtComplete:false,blink:[],presses:[],errors};
  const appRoot=path.resolve(__dirname,'../..');
  report.appVersion=JSON.parse(await fs.readFile(path.join(appRoot,'package.json'),'utf8')).version;
  report.sourceSha256=Object.fromEntries(await Promise.all(['src/pet/presentation.ts','src/renderer/live2d/Live2DAdapter.ts','src/renderer/live2d/CubismBackend.ts','public/models/changli/model.json'].map(async file=>[file,require('node:crypto').createHash('sha256').update(await fs.readFile(path.join(appRoot,file))).digest('hex').toUpperCase()])));
  report.blinkVisualAcceptance=false;report.candidateVersion=70;report.modelEntry=await page.evaluate(()=>window.inputBlinkQa.modelEntry);if(!report.modelEntry.includes('v70-candidate/'))throw Error('Wrong candidate rendered');
  report.blinkVisualNote='Timing, full closure and restoration checked; candidatev70 official Core review is recorded separately. Dynamic/native visual acceptance remains separate.';
  for(const t of [3950,4000,4020,4040,4060,4080,4096,4114,4135,4155,4187.5,4225,4260]){
   await page.evaluate(t=>window.inputBlinkQa.freeze(t),t);await page.waitForTimeout(90);
   const values=await page.evaluate(()=>window.inputBlinkQa.get());
   report.blink.push({time:t,left:values.ParamEyeLOpen,right:values.ParamEyeROpen});
   await page.screenshot({path:path.join(folder,`blink-${t}.png`),clip:{x:215,y:280,width:365,height:240}});
  }
  const peak=(a,b)=>Math.max(...a.positions.map((v,i)=>Math.abs(v-b.positions[i])));
  const sample=async(signal,mode)=>{
   await page.evaluate(mode=>window.inputBlinkQa.live(mode),mode);await page.waitForTimeout(500);
   const base=await page.evaluate(()=>window.inputBlinkQa.geometry());
   await page.evaluate(s=>window.inputBlinkQa.input(s),signal);
   let left=0,right=0,lp=0,rp=0;const start=Date.now();
   while(Date.now()-start<480){await page.waitForTimeout(12);const s=await page.evaluate(()=>({g:window.inputBlinkQa.geometry(),p:window.inputBlinkQa.get()}));
    left=Math.max(left,peak(base.ArtMesh10,s.g.ArtMesh10));right=Math.max(right,peak(base.ArtMesh9,s.g.ArtMesh9));
    lp=Math.max(lp,s.p.ParamHandLeftPress);rp=Math.max(rp,s.p.ParamHandRightPress);}
   const expectedLeft=signal==='left'||signal==='right'||(mode==='keyboard_only'&&signal==='keyboard_left');
   return {signal,mode,leftPixels:left,rightPixels:right,leftParameterPeak:lp,rightParameterPeak:rp,
    pass:expectedLeft?left>3&&right<.001&&lp>20&&rp===0:right>3&&left<.001&&rp>20&&lp===0};
  };
  for(const s of ['keyboard_left','keyboard_right','space','enter','backspace','left','right'])report.presses.push(await sample(s,'keyboard_mouse'));
  report.presses.push(await sample('keyboard_left','keyboard_only'));
  await page.evaluate(()=>window.inputBlinkQa.live());await page.waitForTimeout(500);
  let leftPeak=0,rightPeak=0;
  for(let n=0;n<18;n++){
   await page.evaluate(s=>window.inputBlinkQa.input(s),n%2?'keyboard_left':'keyboard_right');
   await page.waitForTimeout(40);const p=await page.evaluate(()=>window.inputBlinkQa.get());
   leftPeak=Math.max(leftPeak,p.ParamHandLeftPress);rightPeak=Math.max(rightPeak,p.ParamHandRightPress);
  }
  await page.waitForTimeout(550);const rest=await page.evaluate(()=>window.inputBlinkQa.get());
  report.rapid={keys:18,leftPeak,rightPeak,rest:[rest.ParamHandLeftPress,rest.ParamHandRightPress],pass:leftPeak===0&&rightPeak>3&&Math.abs(rest.ParamHandLeftPress)<.001&&Math.abs(rest.ParamHandRightPress)<.001};
  // Switch from a live mouse press to a key without waiting for its 0.4s motion.
  await page.evaluate(()=>window.inputBlinkQa.input('left'));await page.waitForTimeout(100);
  await page.evaluate(()=>window.inputBlinkQa.input('keyboard_left'));await page.waitForTimeout(35);
  const switched=await page.evaluate(()=>window.inputBlinkQa.get());
  report.mouseToKeyboard={left:switched.ParamHandLeftPress,right:switched.ParamHandRightPress,pass:Math.abs(switched.ParamHandLeftPress)<.001&&switched.ParamHandRightPress>0};
  const b=report.blink;report.blinkPass=b.every(s=>Math.abs(s.left-s.right)<.001&&s.left>=0&&s.left<=1)&&b.find(s=>s.time===4096).left<.001&&b.find(s=>s.time===4114).left<.001&&b.at(-1).left>.999;
  report.pass=report.blinkPass&&report.presses.every(s=>s.pass)&&report.rapid.pass&&report.mouseToKeyboard.pass&&errors.length===0;
  await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
