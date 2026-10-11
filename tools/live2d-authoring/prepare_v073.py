"""Configure geometry cutouts and elastic animation; preserve native exports."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
def edit(path, old, new):
 p=ROOT/path;s=p.read_text(encoding='utf-8-sig')
 if old not in s:raise ValueError(f'Missing {path}: {old}')
 p.write_text(s.replace(old,new,1),encoding='utf-8',newline='\n')
for p in ('package.json','src-tauri/tauri.conf.json'):edit(p,'"version": "0.7.2"','"version": "0.7.3"')
edit('src-tauri/Cargo.toml','version = "0.7.2"','version = "0.7.3"')
edit('src-tauri/Cargo.lock','name = "changli-companion"\nversion = "0.7.2"','name = "changli-companion"\nversion = "0.7.3"')
p=ROOT/'package-lock.json';j=json.loads(p.read_text(encoding='utf-8-sig'));j['version']=j['packages']['']['version']='0.7.3';p.write_text(json.dumps(j,indent=2)+'\n',encoding='utf-8',newline='\n')
p=ROOT/'public/models/changli/model.json';j=json.loads(p.read_text(encoding='utf-8-sig'));j['version']='0.12.3';r=j['renderer']['live2d']
r['entry']='live-reference-repair-v71-candidate/ChangliReferenceRepairV71-elastic.model3.json'
r['motionMap'].update(mouse_right='LeftPress/0',wheel='LeftPress/0')
r['art_status']='v71原生模型+运行时网格修整。两只手上缘残片按UV轮廓裁切，尾羽纵向加长22%，大头带阻尼弹性/挤压回弹，凤凰常驻摆动和火苗弯曲。去掉抬手与鼠标倾手/滚轮变体。不是新Cubism原生美术导出；精细表情仍待制作。'
j['art_status']=r['art_status']
o=r['runtimeOffsets'];o['contours']={
 'ArtMesh10':[[0,.60],[.12,.40],[.28,.27],[.46,.19],[.62,.18],[.76,.21],[.90,.36],[1,.60],[1,1],[0,1]],
 'ArtMesh9':[[0,.60],[.12,.32],[.28,.20],[.46,.14],[.63,.16],[.78,.23],[.92,.38],[1,.64],[1,1],[0,1]],
 'ArtMesh53':[[0,0],[1,0],[1,.74],[0,.74]],
 'ArtMesh36':[[0,0],[1,0],[1,1],[.54,1],[0,.32]],
}
report=json.loads((ROOT/'tools/live2d-authoring/build/reference-repair-v71-core-verification-20261006.json').read_text(encoding='utf-8-sig'))
fixed={'ArtMesh9','ArtMesh10','ArtMesh20','ArtMesh34','ArtMesh35','ArtMesh49','ArtMesh50','ArtMesh51','ArtMesh54','ArtMesh55','ArtMesh56'}
o['head']={'ids':[b['id'] for b in report['bounds'] if b['id'] not in fixed],'anchor':[627,870]}
o['tail']={'ids':['ArtMesh31','ArtMesh57','ArtMesh58'],'anchorY':750,'stretch':1.22}
o['phoenix']={'ids':['ArtMesh49','ArtMesh50','ArtMesh51'],'anchor':[1115,925]};o['flameMesh']='ArtMesh50'
p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
folder=p.parent/'live-reference-repair-v71-candidate';entry=json.loads((folder/'ChangliReferenceRepairV71-interactions.model3.json').read_text(encoding='utf-8-sig'))
(folder/'ChangliReferenceRepairV71-elastic.model3.json').write_text(json.dumps(entry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('0.7.3 configured; official MOC/atlases/source untouched.')
