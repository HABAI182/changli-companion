"""Record this run's observations of the delivered EXE; do not inherit old proof."""
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
folder=HERE/'build/desktop-0.6.3-ui-20261006'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
text=(folder/'native-input-observation.txt').read_text(encoding='utf-8')
m=re.search(r'左键区 (\d+)、右键区 (\d+)、特殊键 (\d+)、鼠标 (\d+)',text)
if not m or tuple(map(int,m.groups()))!=(1,1,0,0) or 'Live2D 已加载' not in text:raise ValueError('Actual input/load observation mismatch')
images=('native-launch.png','native-happy-closed.png','native-default-restored.png','native-menu.png',
        'native-settings-loaded.png','native-input-baseline.png','native-input-counters.png',
        'native-explorer-a.png','native-explorer-j.png')
if any(not (folder/name).is_file() for name in images):raise ValueError('Native observation missing')
delivery=ROOT/'deliveries/20261008-desktop-0.6.3'
artifacts=json.loads((delivery/'SHA256.json').read_text(encoding='utf-8-sig'))
for row in artifacts:
    if sha(delivery/row['file'])!=row['sha256']:raise ValueError('Delivered artifact changed')
files=('src/App.tsx','src/style.css','src/model.ts','src/renderer/live2d/Live2DAdapter.ts','src-tauri/src/input.rs','public/models/changli/model.json','vite.config.ts')
doc={'savedAt':datetime.now().astimezone().isoformat(),'appVersion':'0.6.3','candidate':59,'buildExitCode':0,
     'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,'nativeTailAndReplacementKeyboardVisible':True,
     'nativeMenuPetOnlyVerified':True,'nativeSettingsWindowVerified':True,'nativeSettingsLive2DReadyObserved':True,
     'nativeHappyClosedAndDefaultRestoredObserved':True,'nativeTouchResponseObserved':True,
     'nativeTouchClosedFrameVerified':False,'nativePhoenixMenuTriggerObserved':True,'nativePhoenixFullMotionVisualAcceptance':False,
     'crossApplicationInputCountersVerified':True,'nativeInputObserved':{'baseline':{'left':0,'right':0,'special':0,'mouse':0},
       'baselineSource':'Manually read native-input-baseline.png',
       'after':dict(zip(('left','right','special','mouse'),map(int,m.groups()))),
       'source':'Sky A/J in foreground Explorer; refreshed native counters and saved UIA tree',
       'physicalHardwareTypingVerified':False},
     'installerInstallUninstallVerified':False,'multiDpiVerified':False,'completeWindowsAcceptance':False,
     'formalArtComplete':False,'sourceSha256':{name:sha(ROOT/name) for name in files},'artifacts':artifacts,
     'proofImages':[{'file':name,'sha256':sha(folder/name)} for name in images],
     'productionPayloadMiB':round(sum(p.stat().st_size for p in (ROOT/'dist').rglob('*') if p.is_file())/1048576,2),
     'productionOnlyActiveModel':sorted(p.name for p in (ROOT/'dist/models/changli').iterdir() if p.is_dir() and p.name.startswith('live-'))==['live-reference-repair-v59-candidate']}
(folder/'windows-verification-status.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Windows 0.6.3 actual delivered EXE observations saved; install/uninstall and final art remain pending.')
