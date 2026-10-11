"""Generate a read-only actual Core/Adapter probe for near-closed blink layers."""
from pathlib import Path
import subprocess
HERE=Path(__file__).resolve().parent
source=(HERE/'verify_input_blink_core.cjs').read_text(encoding='utf-8')
prefix=source[:source.index('const peak=')]
probe=r'''
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
'''
target=HERE/'inspect_blink_layers.cjs';target.write_text(prefix+probe,encoding='utf-8')
subprocess.run(['node',str(target)],check=True,cwd=HERE)
