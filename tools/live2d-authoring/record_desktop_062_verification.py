"""Persist only the Windows 0.6.2 observations made in this run."""
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
folder=HERE/'build/desktop-0.6.2-ui-20261006'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def counters(text):
    match=re.search(r'左键区 (\d+)、右键区 (\d+)、特殊键 (\d+)、鼠标 (\d+)',text)
    if not match:raise ValueError('Native input counter observation missing')
    return dict(zip(('left','right','special','mouse'),map(int,match.groups())))
before=(folder/'native-input-baseline.txt').read_text(encoding='utf-8')
after=(folder/'native-input-observation.txt').read_text(encoding='utf-8')
baseline,observed=counters(before),counters(after)
if observed['left']-baseline['left']!=1 or observed['right']-baseline['right']!=1 or 'Live2D 已加载' not in after:
    raise ValueError('Current native input/load observations do not match')
images=('native-launch.png','native-touch-closed.png','native-touch-restored.png',
        'native-menu.png','native-settings-loaded.png','native-input-counters.png')
if any(not (folder/name).is_file() for name in images):raise ValueError('Native proof missing')
delivery=ROOT/'deliveries/20261008-desktop-0.6.2'
artifacts=json.loads((delivery/'SHA256.json').read_text(encoding='utf-8-sig'))
for row in artifacts:
    if sha(delivery/row['file'])!=row['sha256']:raise ValueError('Delivered artifact changed')
files=('src/App.tsx','src/style.css','src/model.ts','src/manifest-modules.d.ts',
       'src/renderer/layered/layerManifest.ts','src/pet/presentation.ts',
       'src/renderer/live2d/Live2DAdapter.ts','src-tauri/src/input.rs',
       'public/models/changli/model.json','vite.config.ts')
doc={'savedAt':datetime.now().astimezone().isoformat(),'appVersion':'0.6.2','candidate':56,
     'buildExitCode':0,'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,
     'nativeMenuPetOnlyVerified':True,'nativeSettingsWindowVerified':True,
     'nativeSettingsLive2DReadyObserved':True,'nativeSettingsExtrasInitiallyCollapsed':True,
     'nativeTouchSmileClosedAndRestoredObserved':True,
     'crossApplicationInputCountersVerified':True,
     'nativeInputObserved':{'baseline':baseline,'after':observed,
       'source':'Sky A/J in foreground Explorer; actual native counters refreshed afterwards',
       'physicalHardwareTypingVerified':False},
     'notRecheckedInThisBuild':['Held shortcut to Default menu recovery (observed in 0.6.1)',
                               'Native idle gesture visual acceptance'],
     'installerInstallUninstallVerified':False,'completeWindowsAcceptance':False,
     'formalArtComplete':False,'sourceSha256':{name:sha(ROOT/name) for name in files},
     'artifacts':artifacts,'proofImages':[{'file':name,'sha256':sha(folder/name)} for name in images],
     'productionPayloadMiB':round(sum(p.stat().st_size for p in (ROOT/'dist').rglob('*') if p.is_file())/1048576,2),
     'productionOnlyActiveModel':sorted(p.name for p in (ROOT/'dist/models/changli').iterdir()
        if p.is_dir() and p.name.startswith('live-'))==['live-reference-repair-v56-candidate']}
(folder/'windows-verification-status.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Windows 0.6.2: actual native launch, transparency, touch, menu/settings and cross-app A/J recorded.')
