"""Author expressive presets/motion curves; preserve the verified CMO3/MOC3."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p, v): p.write_text(json.dumps(v, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
model_file = ROOT/'public/models/changli/model.json'
model = read(model_file)
folder = model_file.parent/'live-reference-repair-v71-candidate'
entry = read(folder/'ChangliReferenceRepairV71-elastic.model3.json')
rig = model['renderer']['live2d']
# Eye openness, smile, mouth form/open, gaze X/Y and head angle. Different
# expressions remain visibly distinct even with vector accents disabled.
faces = {
 'blush': (.84, .84, .12, .35, .05, -.12, -.2, -2),
 'laugh': (0, 0, 1, 1, .8, 0, 0, -2),
 'angry': (.65, .65, 0, -.85, .14, 0, -.1, 2),
 'pout': (.79, .79, 0, -1, 0, -.32, -.12, -3),
 'shy': (.64, .72, .18, .3, .08, -.55, -.32, -5),
 'wronged': (.92, .92, 0, -.7, .12, .08, -.36, -2),
 'proud': (.56, .83, .1, .75, .1, .45, .25, 4),
 'phoenix_eyes': (1, 1, 0, .35, .08, 0, 0, 0),
 'flame_eyes': (.9, .9, 0, -.4, .25, 0, 0, 2),
}
params = ['ParamEyeLOpen','ParamEyeROpen','ParamEyeLSmile','ParamMouthForm',
          'ParamMouthOpenY','ParamEyeBallX','ParamEyeBallY','ParamAngleZ']
for id, values in faces.items():
 name = ''.join(s.title() for s in id.split('_'))+'Reaction'
 file = f'reaction-{id}.exp3.json'
 rows=[{'Id':p,'Value':v,'Blend':'Overwrite'} for p,v in zip(params, values)]
 rows.append({'Id':'ParamEyeRSmile','Value':values[2],'Blend':'Overwrite'})
 write(folder/file, {'Type':'Live2D Expression','FadeInTime':.18,'FadeOutTime':.2,'Parameters':rows})
 entry['FileReferences']['Expressions']=[e for e in entry['FileReferences']['Expressions'] if e['Name']!=name]
 entry['FileReferences']['Expressions'].append({'Name':name,'File':file})
 rig['expressionMap'][id]=name
for e in model['expressions']: e['status']='runtime-preset'
rig['runtimeOffsets']['faceEffects']=True
rig['runtimeOffsets']['skinPatches']={'ArtMesh41':{'bounds':[.375,.773,.083,.116],'shift':[.11,0]}}
rig['runtimeOffsets']['contours']['ArtMesh10']=[[0,.60],[.12,.40],[.28,.27],[.46,.19],[.62,.22],[.76,.33],[.9,.51],[1,.72],[1,1],[0,1]]
rig['runtimeOffsets']['contours']['ArtMesh9']=[[0,.60],[.12,.32],[.28,.20],[.46,.14],[.63,.18],[.78,.30],[.92,.50],[1,.75],[1,1],[0,1]]

def motion(id, group, duration, curves):
 out=[]
 for param, values in curves.items():
  points=[(round(duration*t,4),v) for t,v in values]
  segments=list(points[0])
  for t,v in points[1:]: segments += [0,t,v]
  out.append({'Target':'Parameter','Id':param,'Segments':segments})
 file=f'action-{id}.motion3.json'
 write(folder/file,{'Version':3,'Meta':{'Duration':duration,'Fps':60,'Loop':False,'AreBeziersRestricted':True,
  'CurveCount':len(out),'TotalSegmentCount':sum(len(v)-1 for v in curves.values()),
  'TotalPointCount':sum(len(v) for v in curves.values()),'UserDataCount':0,'TotalUserDataSize':0,
  'FadeInTime':.08,'FadeOutTime':.12},'Curves':out,'UserData':[]})
 entry['FileReferences']['Motions'][group]=[{'File':file,'FadeInTime':.08,'FadeOutTime':.12}]
 rig['motionMap'][id]=group+'/0'
 definitions=next(a for a in model['animations'] if a['id']==id)
 definitions['duration']=round(duration*1000)
 definitions['status']='ready'

motion('wave','Greeting',1.8,{'ParamAngleZ':[(0,0),(.2,-3),(.4,3),(.6,-2),(.8,1),(1,0)]})
next(a for a in model['animations'] if a['id']=='wave')['name']='打招呼'
motion('sleep','Nap',2.4,{'ParamAngleZ':[(0,0),(.35,-5),(.7,-5),(1,0)],'ParamBreath':[(0,0),(.3,.4),(.6,.15),(.8,.4),(1,0)]})
motion('angry_fire','AngryFire',1.7,{'ParamAngleZ':[(0,0),(.15,-3),(.3,3),(.45,-3),(.6,3),(.8,-1),(1,0)],'ParamPhoenixWingSway':[(0,0),(.2,18),(.4,-18),(.6,18),(.8,-12),(1,0)]})
motion('shy','Shy',1.8,{'ParamAngleZ':[(0,0),(.3,-4),(.7,-4),(1,0)],'ParamEyeBallX':[(0,0),(.3,-.4),(.7,-.4),(1,0)]})
motion('phoenix','PhoenixInteract',2.2,{'ParamPhoenixSway':[(0,0),(.2,10),(.4,4),(.6,10),(.8,4),(1,0)],
 'ParamPhoenixWingSway':[(0,0),(.12,22),(.25,-22),(.38,22),(.5,-22),(.62,22),(.75,-22),(.88,12),(1,0)],
 'ParamPhoenixTailSway':[(0,0),(.25,15),(.5,-15),(.75,12),(1,0)]})
rig['entry']='live-reference-repair-v71-candidate/ChangliReferenceRepairV71-expressive.model3.json'
write(folder/'ChangliReferenceRepairV71-expressive.model3.json',entry)
model['version']='0.12.4'
model['art_status']=rig['art_status']='v71原生Live2D，17个可用表情和5段动作；附加表情符号为随脸网格运动的运行时矢量美术，未写入CMO3。保留尾羽加长、弹性和轮廓裁切。'
write(model_file,model)
for path in ['package.json','src-tauri/tauri.conf.json']:
 p=ROOT/path; data=read(p);data['version']='0.7.4';write(p,data)
p=ROOT/'package-lock.json';data=read(p);data['version']=data['packages']['']['version']='0.7.4';write(p,data)
for path in ['src-tauri/Cargo.toml','src-tauri/Cargo.lock']:
 p=ROOT/path; s=p.read_text(encoding='utf-8-sig')
 if path.endswith('Cargo.toml'): s=s.replace('version = "0.7.3"','version = "0.7.4"',1)
 else: s=s.replace('name = "changli-companion"\nversion = "0.7.3"','name = "changli-companion"\nversion = "0.7.4"',1)
 p.write_text(s,encoding='utf-8')
print('0.7.4 expressive resources authored; original native source preserved.')
