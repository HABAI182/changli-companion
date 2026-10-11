"""Versioned runtime presets; do not modify the released native CMO/MOC."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[2]
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
mfile=ROOT/'public/models/changli/model.json'
m=read(mfile); rig=m['renderer']['live2d']; folder=mfile.parent/'live-reference-repair-v71-candidate'
entry=read(folder/'ChangliReferenceRepairV71-expressive.model3.json')
for name,values in {'smile':{'ParamEyeLOpen':1,'ParamEyeROpen':1,'ParamEyeLSmile':0,'ParamEyeRSmile':0,'ParamMouthForm':.65,'ParamMouthOpenY':0},'sleepy':{'ParamEyeLOpen':0,'ParamEyeROpen':0,'ParamEyeLSmile':1,'ParamEyeRSmile':1,'ParamMouthForm':0,'ParamMouthOpenY':0,'ParamAngleZ':-2,'ParamEyeBallY':0}}.items():
    file=f'reaction-{name}-v075.exp3.json'
    write(folder/file,{'Type':'Live2D Expression','FadeInTime':.18,'FadeOutTime':.22,'Parameters':[{'Id':k,'Value':v,'Blend':'Overwrite'} for k,v in values.items()]})
    for e in entry['FileReferences']['Expressions']:
        if e['Name']==rig['expressionMap'][name]: e['File']=file
for action,group in [('wave','Greeting'),('sleep','Nap')]:
    rig['motionMap'].pop(action,None);entry['FileReferences']['Motions'].pop(group,None)
m['animations']=[a for a in m['animations'] if a['id'] not in ['wave','sleep']]
for slot in m['shortcuts']:
    if slot['action']['type']=='animation' and slot['action']['id'] in ['wave','sleep']:
        slot['enabled']=False;slot['action']={'type':'expression','id':'default'}
rig['runtimeOffsets'].update({'reachPixels':120,'depthPixels':18,'keyboardMesh':'ArtMesh56','keyboardAsset':'assets/keyboard-four-zones.svg'})
rig['entry']='live-reference-repair-v71-candidate/ChangliReferenceRepairV71-desktop-v075.model3.json'
m['version']='0.12.5';m['art_status']=rig['art_status']='v71原生Live2D；0.7.5运行资源：四区键盘、睁眼开心、闭眼困倦、随脸矢量效果；未重新导出CMO3'
write(folder/'ChangliReferenceRepairV71-desktop-v075.model3.json',entry);write(mfile,m)
for file in ['package.json','package-lock.json','src-tauri/tauri.conf.json']:
    p=ROOT/file;d=read(p);d['version']='0.7.5'
    if file=='package-lock.json': d['packages']['']['version']='0.7.5'
    write(p,d)
for file in ['src-tauri/Cargo.toml','src-tauri/Cargo.lock']:
    p=ROOT/file;s=p.read_text(encoding='utf-8-sig');s=s.replace('version = "0.7.4"','version = "0.7.5"',1) if file.endswith('toml') else s.replace('name = "changli-companion"\nversion = "0.7.4"','name = "changli-companion"\nversion = "0.7.5"',1);p.write_text(s,encoding='utf-8')
print('0.7.5 resources prepared, verified native source preserved')
