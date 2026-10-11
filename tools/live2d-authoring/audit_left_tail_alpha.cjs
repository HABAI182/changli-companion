// Read-only alpha audit of the exact official SDK render, without overrides.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const version=Number(process.argv[2]||57);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2600,height:1300}});
  await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`);
  await page.waitForFunction(()=>window.referenceRepair,null,{timeout:25000});
  const audit=await page.evaluate(async()=>{
   const reference=new Image();reference.src='./assets/changli-original-clean-alpha-v1.png';await reference.decode();
   const imageCanvas=document.createElement('canvas');imageCanvas.width=imageCanvas.height=1254;
   const imageContext=imageCanvas.getContext('2d');imageContext.drawImage(reference,0,0);
   const original=imageContext.getImageData(0,0,1254,1254).data;
   window.referenceRepair.setPose({});
   const canvas=document.getElementById('model'),gl=canvas.getContext('webgl');
   const actual=new Uint8Array(1254*1254*4);gl.readPixels(0,0,1254,1254,gl.RGBA,gl.UNSIGNED_BYTE,actual);
   const regions={upperJoin:[45,775,155,825],lowerTip:[15,932,140,950],fullTail:[0,775,185,950]};
   const rows=Object.entries(regions).map(([name,[x0,y0,x1,y1]])=>{
    let referenceOpaque=0,missingOpaque=0;const examples=[];
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
     if(original[(y*1254+x)*4+3]<240)continue;referenceOpaque++;
     if(actual[((1253-y)*1254+x)*4+3]<8){missingOpaque++;if(examples.length<12)examples.push([x,y]);}
    }
    return {name,bounds:[x0,y0,x1,y1],referenceOpaque,missingOpaque,examples};
   });
   return {pose:{},regions:rows,tailSilhouettePass:rows.every(r=>r.missingOpaque===0),scope:'Neutral source-opaque alpha coverage only; movement and seams require separate visual acceptance'};
  });
  audit.version=version;audit.officialSdkRender=true;audit.formalArtComplete=false;
  const target=path.join(__dirname,`build/left-tail-v${version}-alpha-audit-20261008.json`);
  await fs.writeFile(target,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
  if(version>=58&&!audit.tailSilhouettePass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
