const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'build/interactions-0.7.0-20261011');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:1420/');
  // Native CSS fixture only. Native screenshots are recorded separately.
  await page.evaluate(()=>{document.body.innerHTML='<main class="native-pet"><div class="pet-wrap"><div class="live2d-renderer"></div><div class="pet-bubble">有我在，不必时时赶路。</div><div class="key-badge">A</div></div></main>';});
  const sizes=[];
  for(const [width,height] of [[180,160],[360,320],[720,640]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);
   sizes.push(await page.evaluate(()=>({width:innerWidth,height:innerHeight,overlays:[...document.querySelectorAll('.pet-bubble,.key-badge')].map(e=>{const r=e.getBoundingClientRect();return {className:e.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})})));
  }
  const report={browser:true,nativeCssFixture:true,windowsDesktopVerified:false,sizes,pass:sizes.every(s=>s.overlays.every(o=>o.inside)),cssSha256:crypto.createHash('sha256').update(await fs.readFile(path.join(root,'src/style.css'))).digest('hex').toUpperCase()};
  await fs.writeFile(path.join(folder,'bubble-bounds.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
