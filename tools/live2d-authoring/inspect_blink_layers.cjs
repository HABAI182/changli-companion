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

const r=runtime(),samples=[];
for(const time of [4040,4050,4060,4070,4080,4114,4140,4155,4170]){
 const p=r.step(time),c=r.backend.model.getModel(),ids=[...c.drawables.ids],g=r.backend.getDrawableSnapshot();
 const meshes=ids.map((id,i)=>({id,opacity:c.drawables.opacities[i],masks:[...c.drawables.masks[i]].map(n=>ids[n]),vertices:g[id]?.positions}));
 samples.push({time,opening:p.ParamEyeLOpen,meshes});
}
const doc={readOnly:true,actualCoreAndAdapter:true,modelEntry:manifest.renderer.live2d.entry,webglRendered:false,windowsDesktopVerified:false,samples};
fs.writeFileSync(path.join(__dirname,'build/blink-v68-layer-probe-20261009.json'),JSON.stringify(doc,null,2)+'\n');
r.close();console.log('Saved actual Core layer probe without editing native/runtime model.');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
