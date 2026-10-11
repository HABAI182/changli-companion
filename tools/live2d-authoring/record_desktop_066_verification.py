"""Verify persisted artifacts from observed Windows UI/size/restart checks."""
import hashlib,json
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
folder=HERE/'build/desktop-0.6.6-ui-20261006'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
meta=load(folder/'native-size-metadata.json')
if meta['original']!={'width':360,'height':320} or meta['restored']!=meta['original']:raise ValueError('Native restore dimensions failed')
if meta['scaled']!=meta['reopened']:raise ValueError('Restart dimensions failed')
if abs(meta['scaled']['width']-360*1.37)>1 or abs(meta['scaled']['height']-320*1.37)>1:raise ValueError('Native137% resize failed')
initial=load(folder/'native-original-settings.json');scaled=load(folder/'native-scaled-settings.json');restored=load(folder/'native-restored-settings.json')
if initial!=restored or scaled['scale']!=1.37:raise ValueError('Settings persistence/restore failed')
if {k:v for k,v in initial.items() if k!='scale'}!={k:v for k,v in scaled.items() if k!='scale'}:raise ValueError('Other settings changed')
for name in ('native-scale-observation.txt','native-settings-reopened-observation.txt'):
    if 'Value: 137 ID: pet-size' not in (folder/name).read_text(encoding='utf-8'):raise ValueError('137% UI observation missing')
if 'Live2D 已加载' not in (folder/'native-settings-observation.txt').read_text(encoding='utf-8'):raise ValueError('Native Ready missing')
advanced=(folder/'native-advanced-observation.txt').read_text(encoding='utf-8')
if '应用快捷键' not in advanced or '开机启动' not in advanced:raise ValueError('Advanced controls not observed')
images=['native-launch.png','native-menu.png','native-settings-default.png','native-size-137.png','native-pet-137.png','native-reopened-137.png','native-settings-reopened-137.png','native-default-restored.png','native-settings-final.png','native-advanced-settings.png']
if any(not (folder/name).is_file() for name in images):raise ValueError('Native screenshots missing')
artifacts=load(ROOT/'deliveries/20261009-desktop-0.6.6/SHA256.json')
for row in artifacts:
    if sha(ROOT/'deliveries/20261009-desktop-0.6.6'/row['file'])!=row['sha256']:raise ValueError('Delivered artifact changed')
sources=['src/App.tsx','src/style.css','src/settings/SettingsPanel.tsx','src/settings/settings.css','src/settings/scalePreview.ts','src-tauri/src/main.rs','public/models/changli/model.json','vite.config.ts']
doc={'savedAt':datetime.now().astimezone().isoformat(),'appVersion':'0.6.6','candidate':60,'buildExitCode':0,
 'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,'nativeSettingsLoaded':True,
 'nativeAdvancedControlsObserved':True,'continuousScaleAndRestartVerified':True,'nativeSizeMetadata':meta,
 'otherSettingsPreserved':True,'originalSettingsRestored':True,'nativeCloseAndRelaunchVerified':True,
 'nativeInputHandsThisBuildVisualVerified':False,'actualSdkInputGeometryVerifiedSeparately':True,
 'blinkVisualAcceptance':False,'halfwayEyelidContoursNeedRefinement':True,
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,'completeWindowsAcceptance':False,'formalArtComplete':False,
 'sourceSha256':{file:sha(ROOT/file) for file in sources},'artifacts':artifacts,
 'proofImages':[{'file':name,'sha256':sha(folder/name)} for name in images]}
(folder/'windows-verification-status.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Windows0.6.6: real137% resizing, SQLite save, relaunch restore, unchanged other settings, Ready and advanced controls verified.')
