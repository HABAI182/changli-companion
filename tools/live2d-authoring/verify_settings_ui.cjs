const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:1420/');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready');
  const folder=path.join(__dirname,'build/settings-ui-20261009');await fs.mkdir(folder,{recursive:true});
  const stored=()=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')).json).settings);
  const range=page.getByRole('slider',{name:'桌宠大小',exact:true});
  const advancedInitiallyClosed=!(await page.locator('.settings-advanced').evaluate(e=>e.open));
  await page.getByRole('combobox',{name:'输入模式',exact:true}).selectOption('keyboard_only');
  await page.waitForFunction(()=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')||'{}').json||'{}').settings?.inputMode==='keyboard_only');
  await range.focus();await range.press('Home');await range.press('ArrowRight');
  await page.waitForFunction(()=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')||'{}').json||'{}').settings?.scale===.51);
  const keyboardFineAdjustment=Number(await range.inputValue())===51;
  const before=await stored(),box=await range.boundingBox();
  const thumbX=box.x+10+(Number(await range.inputValue())-50)/150*(box.width-20);
  await page.mouse.move(thumbX,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+10+87/150*(box.width-20),box.y+box.height/2,{steps:12});
  const dragged=Number(await range.inputValue()),during=await stored();
  const liveWidth=await page.locator('.art-scale').evaluate(e=>parseFloat(e.style.width));
  const previewBeforeCommit=Math.abs(liveWidth-dragged*3.6)<.01&&during.scale===before.scale;
  await page.mouse.up();await page.waitForFunction(n=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')).json).settings.scale===n/100,dragged);
  const committed=await stored(),continuousNonPreset=![50,75,100,125,150,200].includes(dragged)&&dragged>50&&dragged<200;
  await page.reload();await range.waitFor();await page.waitForFunction(n=>Number(document.querySelector('#pet-size').value)===n,dragged);
  const restored=await stored(),restartRestoresScale=restored.scale===dragged/100&&restored.inputMode==='keyboard_only';
  await page.getByRole('button',{name:'恢复默认大小',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')).json).settings.scale===1);
  const defaultRestored=Number(await range.inputValue())===100;
  await page.getByRole('combobox',{name:'输入模式',exact:true}).selectOption('keyboard_mouse');
  await page.waitForFunction(()=>JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')).json).settings.inputMode==='keyboard_mouse');
  await page.waitForFunction(()=>document.querySelector('.character-status')?.textContent.includes('Live2D 已加载'));
  await page.setViewportSize({width:480,height:760});
  // Actual React settings in the native CSS container; this is a browser fixture.
  await page.evaluate(()=>{const panel=document.querySelector('.settings-page'),main=document.querySelector('main');main.replaceChildren(panel);main.className='native-panel';});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(folder,'settings-default-480.png')});
  const widths=[];
  for(const width of [360,390,480,620]){
   await page.setViewportSize({width,height:760});
   widths.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth})));
  }
  await page.setViewportSize({width:480,height:760});
  await page.locator('.settings-advanced > summary').click();
  const advancedOnRequest=await page.getByRole('button',{name:'应用快捷键',exact:true}).isVisible();
  await page.locator('.settings-advanced').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(folder,'settings-advanced-480.png')});
  const sources=['src/App.tsx','src/style.css','src/settings/SettingsPanel.tsx','src/settings/settings.css','src/settings/scalePreview.ts','src-tauri/src/main.rs'];
  const sourceSha256=Object.fromEntries(await Promise.all(sources.map(async file=>[file,crypto.createHash('sha256').update(await fs.readFile(path.join(__dirname,'../..',file))).digest('hex').toUpperCase()])));
  const appVersion=JSON.parse(await fs.readFile(path.join(__dirname,'../../package.json'),'utf8')).version;
  const report={appVersion,browser:true,nativeCssFixture:true,windowsDesktopVerified:false,advancedInitiallyClosed,keyboardFineAdjustment,draggedPercent:dragged,previewBeforeCommit,continuousNonPreset,committedScale:committed.scale,restartRestoresScale,defaultRestored,otherSettingPreserved:committed.inputMode==='keyboard_only',advancedOnRequest,widths,errors,sourceSha256};
  report.pass=advancedInitiallyClosed&&keyboardFineAdjustment&&previewBeforeCommit&&continuousNonPreset&&restartRestoresScale&&defaultRestored&&report.otherSettingPreserved&&advancedOnRequest&&widths.every(w=>w.noHorizontalOverflow)&&errors.length===0;
  await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
