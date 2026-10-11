// Actual SDK/Core motion evaluation without DOM, WebGL or network access.
// Raster and Windows UI acceptance remain separate checks.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Module=require('node:module');
const root=path.resolve(__dirname,'../..'),ts=require(path.join(root,'node_modules/typescript'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/models/changli/model.json'),'utf8'));
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){if(id==='virtual:changli-model')return 'changli-model-data';if(id==='virtual:changli-layers')return 'changli-layers-data';return originalResolve.call(this,id,...args);};
for(const [id,file] of [['changli-model-data','model.json'],['changli-layers-data','assets/layers/layers.json']]){
 const m=new Module(id);m.exports=JSON.parse(fs.readFileSync(path.join(root,'public/models/changli',file),'utf8'));Module._cache[id]=m;
}
Module._extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const coreFile=path.join(root,'public/vendor/live2d/live2dcubismcore.min.js');
const context={console,process,require,__dirname:path.dirname(coreFile),__filename:coreFile,Buffer,WebAssembly,TextDecoder,TextEncoder,setTimeout,clearTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync(coreFile,'utf8'),context);
global.Live2DCubismCore=context.Live2DCubismCore;
global.requestAnimationFrame=()=>1;global.cancelAnimationFrame=()=>{};
(async()=>{
 for(let attempts=0;;attempts++){
  try{Live2DCubismCore.Version.csmGetVersion();break;}catch(e){if(attempts>100)throw e;await new Promise(resolve=>setTimeout(resolve,10));}
 }
const sdk=name=>require(path.join(root,'vendor/live2d/src',name));
const {CubismFramework}=sdk('live2dcubismframework.ts');CubismFramework.startUp();CubismFramework.initialize();
const {CubismMoc}=sdk('model/cubismmoc.ts'),{CubismMotion}=sdk('motion/cubismmotion.ts');
const {CubismExpressionMotion}=sdk('motion/cubismexpressionmotion.ts');
const {CubismBackend}=require(path.join(root,'src/renderer/live2d/CubismBackend.ts'));
const {Live2DAdapter}=require(path.join(root,'src/renderer/live2d/Live2DAdapter.ts'));
const {PresentationRuntime}=require(path.join(root,'src/pet/presentation.ts'));
const directory=path.join(root,'public/models/changli',path.dirname(manifest.renderer.live2d.entry));
const refs=JSON.parse(fs.readFileSync(path.join(root,'public/models/changli',manifest.renderer.live2d.entry),'utf8')).FileReferences;
const buffer=file=>{const b=fs.readFileSync(path.join(directory,file));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const settings={motion:'full',inputMode:'keyboard_mouse',autoSleepMinutes:0};
let now=0;
function runtime(mode='keyboard_mouse'){
 const backend=new CubismBackend();backend.moc=CubismMoc.create(buffer(refs.Moc),true);backend.model=backend.moc.createModel();backend.model.saveParameters();
 backend.gl={viewport(){},clearColor(){},clear(){},COLOR_BUFFER_BIT:16384};backend.canvas={width:800,height:800};
 backend.renderer={setMvpMatrix(){},setRenderState(){},drawModel(){}};
 for(const [group,files]of Object.entries(refs.Motions))for(const [i,row]of files.entries()){
  const b=buffer(row.File),motion=CubismMotion.create(b,b.byteLength);
  motion.setEffectIds([],[]);backend.motions.set(`${group}/${i}`,motion);
 }
 for(const row of refs.Expressions){const b=buffer(row.File);backend.expressions.set(row.Name,CubismExpressionMotion.create(b,b.byteLength));}
 const adapter=new Live2DAdapter(manifest.renderer.live2d,backend);adapter.status='ready';
 const pet=new PresentationRuntime(0,()=>0);now=0;settings.inputMode=mode;
 return {backend,adapter,pet,step(t){now=t;const s=pet.snapshot(t,settings);
  for(const id of ['gazeX','gazeY','headTilt','headTurn','hairSway','ornamentSway','phoenixFloat'])s.idle[id]=0;
  adapter.update(s);backend.draw(t);return backend.getParameterSnapshot();},
  input(signal){pet.input(signal,now,0,0,mode);},close(){backend.moc.deleteModel(backend.model);backend.moc.release();}};
}
const peak=(a,b)=>Math.max(...a.positions.map((v,i)=>Math.abs(v-b.positions[i])));
const report={officialCore:true,actualBackendAndAdapter:true,webglRendered:false,windowsDesktopVerified:false,formalArtComplete:false,presses:[],blink:[]};
report.appVersion=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
report.modelEntry=manifest.renderer.live2d.entry;
report.physicsIncluded=false; // Isolate hand/blink evaluation; native v60 physics is unchanged.
report.sourceSha256=Object.fromEntries(['src/pet/presentation.ts','src/renderer/live2d/Live2DAdapter.ts','src/renderer/live2d/CubismBackend.ts','public/models/changli/model.json'].map(file=>[file,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').toUpperCase()]));
for(const [signal,mode]of [...['keyboard_left','keyboard_right','space','enter','backspace','left','right'].map(s=>[s,'keyboard_mouse']),['keyboard_left','keyboard_only']]){
 const r=runtime(mode);for(let t=0;t<=500;t+=10)r.step(t);const base=r.backend.getDrawableSnapshot();r.input(signal);
 let left=0,right=0,lp=0,rp=0;
 for(let t=510;t<=1000;t+=10){const p=r.step(t),g=r.backend.getDrawableSnapshot();left=Math.max(left,peak(base.ArtMesh10,g.ArtMesh10));right=Math.max(right,peak(base.ArtMesh9,g.ArtMesh9));lp=Math.max(lp,p.ParamHandLeftPress);rp=Math.max(rp,p.ParamHandRightPress);}
 const expectedLeft=signal==='left'||signal==='right'||mode==='keyboard_only';
 report.presses.push({signal,mode,leftPixels:left,rightPixels:right,leftParameterPeak:lp,rightParameterPeak:rp,pass:expectedLeft?left>3&&right<.001&&lp>20&&rp===0:right>3&&left<.001&&rp>20&&lp===0});r.close();
}
{
 const r=runtime();r.step(0);let leftPeak=0,rightPeak=0;
 for(let n=0;n<18;n++){r.input(n%2?'keyboard_left':'keyboard_right');for(let k=1;k<=4;k++){const p=r.step(n*40+k*10);leftPeak=Math.max(leftPeak,p.ParamHandLeftPress);rightPeak=Math.max(rightPeak,p.ParamHandRightPress);}}
 for(let t=730;t<=1300;t+=10)r.step(t);const p=r.backend.getParameterSnapshot();
 report.rapid={keys:18,leftPeak,rightPeak,rest:[p.ParamHandLeftPress,p.ParamHandRightPress],pass:leftPeak===0&&rightPeak>3&&p.ParamHandLeftPress===0&&p.ParamHandRightPress===0};
 r.input('left');for(let t=1310;t<=1400;t+=10)r.step(t);r.input('keyboard_left');r.step(1410);const switched=r.step(1435);
 report.mouseToKeyboard={left:switched.ParamHandLeftPress,right:switched.ParamHandRightPress,pass:switched.ParamHandLeftPress===0&&switched.ParamHandRightPress>0};r.close();
}
{
 const r=runtime();const samples=[3950,4000,4020,4040,4060,4080,4096,4114,4135,4155,4187.5,4225,4260];let t=0;
 for(const time of samples){while(t+10<time){t+=10;r.step(t);}const p=r.step(time);t=time;report.blink.push({time,left:p.ParamEyeLOpen,right:p.ParamEyeROpen});}r.close();
}
report.blinkPass=report.blink.every(s=>Math.abs(s.left-s.right)<.001&&s.left>=0&&s.left<=1)&&report.blink.find(s=>s.time===4096).left<.001&&report.blink.find(s=>s.time===4114).left<.001&&report.blink.at(-1).left>.999;
report.pass=report.presses.every(s=>s.pass)&&report.rapid.pass&&report.mouseToKeyboard.pass&&report.blinkPass;
const folder=path.join(__dirname,'build/input-blink-20261008');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'core-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
