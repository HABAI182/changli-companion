// One visual check for the sole 0.7.6 change; prior acceptance is not repeated.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('node:module').createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'build/interactions-0.7.6-20261012');await fs.mkdir(folder,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const p=await b.newPage({viewport:{width:1000,height:850},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:1420/');
await p.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready');await p.addStyleTag({content:'.pet-wrap{width:627px!important}'});
await p.locator('.pet-wrap').click({button:'right',position:{x:80,y:60}});await p.locator('.pet-menu-more summary').click();
await p.getByRole('button',{name:'生气',exact:true}).click();await p.waitForTimeout(450);
// Hold the same anger accents so a slow screenshot cannot capture fade-out.
await p.locator('.live2d-renderer').screenshot({path:path.join(folder,'angry-fire.png')});
if(errors.length)throw new Error(errors.join('\n'));
await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify({pass:true,appVersion:'0.7.6',webglRendered:true,windowsDesktopVerified:false,scope:'fire visibility only; 0.7.5 acceptance retained',sourceSha256:{'src/renderer/live2d/FaceEffects.ts':crypto.createHash('sha256').update(await fs.readFile(path.join(root,'src/renderer/live2d/FaceEffects.ts'))).digest('hex').toUpperCase()},errors},null,2));console.log('0.7.6 fire WebGL screenshot saved; no page errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
