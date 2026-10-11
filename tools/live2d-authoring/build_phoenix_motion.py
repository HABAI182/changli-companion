"""Create an explicitly technical runtime motion over native Phoenix parameters.

Native MOC3, textures and physics remain byte-for-byte official exports.
This sequence is not an Editor-authored animation or final art acceptance.
"""
import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

def main(version):
    root = HERE.parents[1] / f'public/models/changli/live-reference-repair-v{version}-candidate'
    poses = {
        'ParamPhoenixSway': [(0,0),(.18,14),(.5,20),(.85,12),(1.2,17),(1.55,4),(1.8,0)],
        'ParamPhoenixWingSway': [(0,0),(.15,18),(.3,-12),(.45,18),(.6,-12),(.75,18),(.9,-12),(1.05,18),(1.2,-9),(1.4,12),(1.6,-4),(1.8,0)],
        'ParamPhoenixTailSway': [(0,0),(.2,-12),(.48,14),(.78,-12),(1.08,14),(1.4,-6),(1.8,0)],
    }
    curves = []
    for identifier, points in poses.items():
        segments = list(points[0])
        for t, value in points[1:]:
            segments.extend([0,t,value])
        curves.append({'Target':'Parameter','Id':identifier,'Segments':segments})
    motion = {'Version':3,'Meta':{'Duration':1.8,'Fps':30,'Loop':False,'AreBeziersRestricted':True,
        'CurveCount':len(curves),'TotalSegmentCount':sum(len(p)-1 for p in poses.values()),
        'TotalPointCount':sum(len(p) for p in poses.values()),'UserDataCount':0,'TotalUserDataSize':0,
        'FadeInTime':.08,'FadeOutTime':.15},'Curves':curves,'UserData':[]}
    (root/'phoenix-interaction.motion3.json').write_text(json.dumps(motion,indent=2)+'\n',encoding='utf-8')
    for suffix in ('.model3.json','-physics.model3.json'):
        file=root/f'ChangliReferenceRepairV{version}{suffix}'
        manifest=json.loads(file.read_text(encoding='utf-8-sig'))
        manifest['FileReferences'].setdefault('Motions',{})['PhoenixInteract']=[{'File':'phoenix-interaction.motion3.json'}]
        file.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    (root/'phoenix-motion-provenance.json').write_text(json.dumps({'nativeModelUnmodified':True,
        'authorship':'runtime technical motion curves over existing native parameters; not Editor animation export',
        'duration':1.8,'formalArtComplete':False},indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--version',type=int,default=30)
    main(parser.parse_args().version)
