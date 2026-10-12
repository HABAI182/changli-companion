// Verify delivered encodes, then produce a storyboard from their decoded frames.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const OUT=path.resolve(__dirname,'../../deliveries/media-20261012-hyperframes-v2');
const ffmpeg=process.env.HYPERFRAMES_FFMPEG_PATH||path.resolve(__dirname,'../../tools/live2d-authoring/.venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
const probe=process.env.HYPERFRAMES_FFPROBE_PATH||path.join(process.env.APPDATA,'npm/node_modules/@ffprobe-installer/win32-x64/ffprobe.exe');
const names=['wide','portrait','wide-master','portrait-master'];
const report=[];
for(const name of names){
  const file=`changli-hyperframes-v2-${name}-45s-60fps.mp4`,full=path.join(OUT,file);
  const p=spawnSync(probe,['-v','error','-show_format','-show_streams','-of','json',full],{encoding:'utf8'});
  if(p.status!==0)throw Error(p.stderr);
  const meta=JSON.parse(p.stdout),v=meta.streams.find(s=>s.codec_type==='video'),a=meta.streams.find(s=>s.codec_type==='audio'),portrait=name.startsWith('portrait');
  if(v.width!==(portrait?1080:1920)||v.height!==(portrait?1920:1080)||v.r_frame_rate!=='60/1'||Number(v.nb_frames)!==2700||Math.abs(Number(meta.format.duration)-45)>.04||v.codec_name!=='h264'||a?.codec_name!=='aac')throw Error(`Unexpected encode metadata: ${file}`);
  const decode=spawnSync(ffmpeg,['-v','error','-i',full,'-f','null','-'],{encoding:'utf8'});
  if(decode.status!==0||decode.stderr.trim())throw Error(`Decode failure: ${file} ${decode.stderr}`);
  const info={file,width:v.width,height:v.height,fps:v.r_frame_rate,frames:Number(v.nb_frames),duration:Number(meta.format.duration),codec:v.codec_name,audioCodec:a.codec_name,audioSampleRate:a.sample_rate,bytes:fs.statSync(full).size,fullDecodePassed:true};
  report.push(info);console.log(JSON.stringify(info));
  if(!name.includes('master')){
    const qc=path.join(OUT,'final-frames',name);fs.mkdirSync(qc,{recursive:true});
    for(const t of [2,6.5,12,17,21,23,25.5,29,35.5,37,40,44]){
      const r=spawnSync(ffmpeg,['-v','error','-ss',String(t),'-i',full,'-frames:v','1','-y',path.join(qc,`at-${t}s.png`)],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);
    }
  }
}
fs.writeFileSync(path.join(OUT,'VIDEO-VERIFICATION.json'),JSON.stringify({verifiedAt:new Date().toISOString(),outputs:report,nativeWindowsFootage:false},null,2)+'\n');
