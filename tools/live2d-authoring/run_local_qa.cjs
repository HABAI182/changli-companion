// Keep a local preview server alive for the entire verification process.
// Only the server spawned here is stopped; an existing preview is reused.
const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const script=process.argv[2];
if(!script || !path.resolve(root,script).startsWith(__dirname+path.sep))throw Error('Expected an authoring QA script inside this project');
const ready=async()=>{try{return (await fetch('http://127.0.0.1:1420/',{signal:AbortSignal.timeout(1000)})).ok}catch{return false}};
(async()=>{
 let server;
 try{
  if(!await ready()){
   server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
   server.stdout.on('data',d=>process.stdout.write(d));server.stderr.on('data',d=>process.stderr.write(d));
   const start=Date.now();while(!await ready()){
    if(server.exitCode!==null || Date.now()-start>20000)throw Error('Local preview did not become ready');
    await new Promise(r=>setTimeout(r,250));
   }
  }
  process.exitCode=await new Promise((resolve,reject)=>{
   const qa=spawn(process.execPath,[script,...process.argv.slice(3)],{cwd:root,windowsHide:true,stdio:'inherit'});
   qa.on('error',reject);qa.on('exit',(code)=>resolve(code??1));
  });
 }finally{server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
