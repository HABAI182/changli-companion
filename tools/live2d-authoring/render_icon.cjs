// Rasterize the editable SVG for Windows packaging; no reference bitmap edits.
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('node:module').createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async()=>{const root=path.resolve(__dirname,'../..'),asset=process.argv[2]||'public/assets/changli-icon-v078.png';
if(asset.endsWith('.png')){await fs.copyFile(path.join(root,asset),path.join(root,'src-tauri/icons/icon-source.png'));return;}
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const p=await b.newPage({viewport:{width:1024,height:1024}});await p.setContent(await fs.readFile(path.join(root,asset),'utf8'));
await p.addStyleTag({content:'html,body{margin:0;background:transparent}svg{display:block;width:1024px;height:1024px}'});await p.screenshot({path:path.join(root,'src-tauri/icons/icon-source.png'),omitBackground:true});
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
