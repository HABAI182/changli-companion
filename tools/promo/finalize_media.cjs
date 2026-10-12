const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn,execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'deliveries/media-20261012-v0712');
const FF=execFileSync(path.join(ROOT,'tools/live2d-authoring/.venv/Scripts/python.exe'),['-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
function run(args){return new Promise((ok,no)=>{const p=spawn(FF,args,{cwd:OUT,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('close',c=>c===0?ok({stdout,stderr}):no(Error(stderr)));});}
(async()=>{const result=[];for(const side of ['wide','vertical']){
 const master=side+'-master.mp4',movie=side+'-bilibili.mp4';
 const color="scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p";
 const flags=['-c:v','libx264','-preset','fast','-crf','19','-maxrate','6M','-bufsize','12M','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-movflags','+faststart'];
 await run(['-hide_banner','-loglevel','error','-y','-i',master,'-vf',`ass=${side}-captions.ass:fontsdir='C\\:/Windows/Fonts',${color}`,...flags,movie]);
 await run(['-hide_banner','-loglevel','error','-y','-i',master,'-vf',color,...flags,side+'-clean-rec709.mp4']);
 await fs.rename(path.join(OUT,side+'-clean-rec709.mp4'),path.join(OUT,master));
 const check=await run(['-hide_banner','-v','error','-i',movie,'-map','0:v:0','-an','-progress','pipe:1','-nostats','-f','null','-']);
 const frames=Number([...check.stdout.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1]);if(frames!==2700)throw Error('Unexpected frame count '+frames);
 const info=await run(['-hide_banner','-i',movie,'-t','0','-f','null','-']);await fs.writeFile(path.join(OUT,side+'-media-info.txt'),info.stderr);
 if(!info.stderr.includes('00:00:45.00')||!info.stderr.includes('60 fps')||!info.stderr.includes('bt709')||!info.stderr.includes('48000 Hz'))throw Error('Media metadata mismatch');
 const signature=await run(['-hide_banner','-v','error','-i',movie,'-vf','fps=2,scale=160:90','-map','0:v:0','-an','-f','framemd5','-']);
 const hashes=signature.stdout.split('\n').filter(s=>s&&!s.startsWith('#')).map(s=>s.split(',').at(-1).trim());const unique=new Set(hashes).size;if(unique<35)throw Error('Animation appears static');
 for(const t of [1,4.6,23.1,32.8,37.2,44.2])await run(['-hide_banner','-v','error','-y','-ss',String(t),'-i',movie,'-frames:v','1',`${side}-final-${t}.jpg`]);
 result.push({file:movie,frames,durationSeconds:45,fps:60,color:'limited-range Rec.709',decodedSuccessfully:true,distinctSampledFrames:unique,source:'browser Live2D/UI replay, approved by user',nativeWindowsRecording:false});console.log(side+' video verified');
}
const files=['wide-bilibili.mp4','vertical-bilibili.mp4','wide-master.mp4','vertical-master.mp4','cover-1200x900.png','cover-1920x1080.png','BILIBILI-POST.md','bgm-original-92bpm.wav','bgm-original-92bpm.m4a','BGM-SOURCE.json','wide-captions.srt','vertical-captions.srt'];const artifacts=[];
for(const name of files){const b=await fs.readFile(path.join(OUT,name));artifacts.push({file:name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex').toUpperCase()});}
await fs.writeFile(path.join(OUT,'MEDIA-VERIFICATION.json'),JSON.stringify({pass:true,version:'media-20261012-v0712',videos:result,coverMethod:'HTML/CSS composition with actual running project model; no character redraw',bgm:'original locally composed and synthesized, no music samples',appVersion:'0.7.12',uploadedToBilibili:false,artifacts},null,2));await fs.writeFile(path.join(OUT,'SHA256.json'),JSON.stringify(artifacts,null,2));console.log('Final media verification and hashes saved');
})().catch(e=>{console.error(e);process.exitCode=1;});
