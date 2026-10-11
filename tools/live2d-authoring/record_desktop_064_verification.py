"""Persist only newly observed Windows 0.6.4 launch/menu/expression/settings proof."""
import hashlib
import json
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
folder=HERE/'build/desktop-0.6.4-ui-20261006'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
if 'Live2D 已加载' not in (folder/'native-settings-observation.txt').read_text(encoding='utf-8'):raise ValueError('Native ready state missing')
images=('native-launch.png','native-menu.png','native-happy-closed.png','native-default-restored.png','native-settings-loaded.png')
if any(not (folder/name).is_file() for name in images):raise ValueError('Actual Windows proof missing')
delivery=ROOT/'deliveries/20261008-desktop-0.6.4'
artifacts=json.loads((delivery/'SHA256.json').read_text(encoding='utf-8-sig'))
for row in artifacts:
    if sha(delivery/row['file'])!=row['sha256']:raise ValueError('Delivered artifact changed')
doc={'savedAt':datetime.now().astimezone().isoformat(),'appVersion':'0.6.4','candidate':60,'buildExitCode':0,
 'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,'nativeTailAndReplacementKeyboardVisible':True,
 'nativeMenuPetOnlyVerified':True,'nativeHappyClosedAndDefaultRestoredObserved':True,
 'nativeSettingsWindowVerified':True,'nativeSettingsLive2DReadyObserved':True,
 'crossApplicationInputCountersVerifiedThisBuild':False,
 'previousInputProof':{'appVersion':'0.6.3','nativeInputCodeUnchanged':True,'test':'Sky A/J in foreground Explorer, native counts0 to1','physicalHardwareTypingVerified':False},
 'notRechecked':['physical typing','touch closed-frame timing','held-shortcut recovery','native Phoenix full motion','idle gesture visual acceptance'],
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,'completeWindowsAcceptance':False,'formalArtComplete':False,
 'sourceSha256':{name:sha(ROOT/name) for name in ('src/App.tsx','src/style.css','src/model.ts','src/renderer/live2d/Live2DAdapter.ts','src-tauri/src/input.rs','public/models/changli/model.json','vite.config.ts')},
 'proofImages':[{'file':name,'sha256':sha(folder/name)} for name in images],'artifacts':artifacts,
 'productionOnlyActiveModel':sorted(p.name for p in (ROOT/'dist/models/changli').iterdir() if p.is_dir() and p.name.startswith('live-'))==['live-reference-repair-v60-candidate'],
 'productionPayloadMiB':round(sum(p.stat().st_size for p in (ROOT/'dist').rglob('*') if p.is_file())/1048576,2)}
(folder/'windows-verification-status.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Windows 0.6.4: newly observed launch, transparent pet, menu, happy/default and native ready saved.')
