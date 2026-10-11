const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const runtimeRequire=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=runtimeRequire('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:1420/');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('changli-live2d-runtime-status')||'null')?.status==='ready',null,{timeout:25000});
  const root=path.join(__dirname,'build/pet-menu-ui-20261006');await fs.mkdir(root,{recursive:true});
  const open=async()=>{await page.locator('.pet-wrap').click({button:'right'});await page.getByRole('dialog',{name:'长离互动菜单'}).waitFor({state:'visible'});};
  await open();
  const expressions=await page.locator('.expression-grid button').allTextContents();
  const menu=page.getByRole('dialog',{name:'长离互动菜单'});
  const common=await menu.evaluate(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}));
  const pendingInitiallyHidden=await page.locator('.pet-menu-pending').count()===0;
  await page.screenshot({path:path.join(root,'browser-menu.png')});
  await page.getByText('更多选项',{exact:true}).click();
  const pendingExpanded=await page.locator('.pet-menu-pending').count()===0;
  await page.screenshot({path:path.join(root,'browser-more-options.png')});
  await page.keyboard.press('Escape');const escapeCloses=!(await menu.isVisible());
  await open();await page.getByRole('button',{name:'开心',exact:true}).click();const expressionCloses=!(await menu.isVisible());
  await open();await page.getByRole('button',{name:'默认',exact:true}).click();
  await open();await page.getByRole('button',{name:'凤凰互动',exact:true}).click();const motionCloses=!(await menu.isVisible());
  await page.waitForTimeout(2000);
  await open();await page.getByRole('button',{name:'关闭互动菜单',exact:true}).click();const closeButtonWorks=!(await menu.isVisible());
  await open();await page.locator('h1').first().click();const outsideCloses=!(await menu.isVisible());
  await open();await page.getByRole('button',{name:'桌宠设置',exact:true}).click();
  const petOnlyUi=await page.getByRole('heading',{name:'桌宠设置',exact:true}).isVisible()&&
    await page.getByRole('button',{name:/专注|待办/}).count()===0&&await page.locator('.tabs').count()===0;
  const modelStatus=page.getByRole('status',{name:'角色状态',exact:true});
  const loadedStatus=await modelStatus.textContent();
  const extra=page.locator('.settings-extra');
  const extrasClosedInitially=!(await extra.evaluate(e=>e.open));
  const audioHiddenInitially=!(await page.getByRole('button',{name:'试听互动音效',exact:true}).isVisible());
  await page.locator('.settings-advanced > summary').click();
  await page.getByText('手柄与音效',{exact:true}).click();
  const extrasOpenOnRequest=await page.getByRole('button',{name:'试听互动音效',exact:true}).isVisible();
  await page.getByText('手柄与音效',{exact:true}).click();
  const diagnosticClosedInitially=!(await page.locator('.runtime-information').evaluate(e=>e.open));
  const fallbackWarningHidden=!(await page.getByText(/备用分层素材：/).isVisible());
  await page.screenshot({path:path.join(root,'settings-status-collapsed.png')});
  await page.getByText('查看运行信息',{exact:true}).click();
  const diagnosticExpanded=await page.getByText(/备用分层素材：/).isVisible();
  await page.screenshot({path:path.join(root,'settings-status-expanded.png')});
  const settingsStatus={loadedStatus,extrasClosedInitially,audioHiddenInitially,extrasOpenOnRequest,diagnosticClosedInitially,fallbackWarningHidden,diagnosticExpanded,
    petOnlyUi,pass:petOnlyUi&&loadedStatus.includes('Live2D 已加载')&&extrasClosedInitially&&audioHiddenInitially&&extrasOpenOnRequest&&diagnosticClosedInitially&&fallbackWarningHidden&&diagnosticExpanded};
  // CSS-only small-window fixture: use the actual React menu with desktop
  // layout classes, without faking a Tauri backend or claiming native QA.
  await page.setViewportSize({width:360,height:320});
  await page.evaluate(()=>{
   const wrap=document.querySelector('.pet-wrap');const main=document.querySelector('main');
   main.replaceChildren(wrap);main.className='native-pet';
  });
  await open();
  await menu.evaluate(e=>{
   const footer=document.createElement('div');footer.className='pet-menu-footer';
   for(const label of ['隐藏桌宠','退出桌宠']){const button=document.createElement('button');button.textContent=label;footer.append(button);}
   e.append(footer);
  });
  const smallWindow=await menu.evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight};});
  await page.screenshot({path:path.join(root,'small-window-layout.png')});
  const pass=expressions.length===4&&common.scrollHeight<=common.clientHeight+1&&pendingInitiallyHidden&&pendingExpanded&&escapeCloses&&expressionCloses&&motionCloses&&closeButtonWorks&&outsideCloses&&smallWindow.top>=0&&smallWindow.left>=0&&smallWindow.bottom<=320&&smallWindow.right<=360&&smallWindow.scrollHeight<=smallWindow.clientHeight+1&&settingsStatus.pass&&!errors.length;
  const sourceSha256={};
  for(const file of ['src/App.tsx','src/style.css','src/settings/SettingsPanel.tsx','src/settings/settings.css','src/settings/scalePreview.ts'])sourceSha256[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(__dirname,'../..',file))).digest('hex').toUpperCase();
  const appVersion=JSON.parse(await fs.readFile(path.join(__dirname,'../../package.json'),'utf8')).version;
  const report={pass,appVersion,sourceSha256,browser:true,smallWindowCssFixture:true,nativeWindowsVerified:false,expressions,common,settingsStatus,pendingInitiallyHidden,pendingExpanded,escapeCloses,expressionCloses,motionCloses,closeButtonWorks,outsideCloses,smallWindow,errors};
  await fs.writeFile(path.join(root,'ui-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
