"""Record observations from the actual delivered Windows executable."""
import hashlib
import json
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
evidence=HERE/'build/desktop-0.6.0-ui-20261006'
observation=(evidence/'native-input-observation.txt').read_text(encoding='utf-8')
if 'Live2D 已加载' not in observation or '左键区 1、右键区 1' not in observation:
    raise ValueError('Native observations do not match recorded result')
files=['src/App.tsx','src/style.css','src/pet/presentation.ts','src/renderer/live2d/Live2DAdapter.ts','src-tauri/src/input.rs','public/models/changli/model.json']
doc={'savedAt':datetime.now().astimezone().isoformat(),'appVersion':'0.6.0','candidate':54,
     'buildExitCode':0,'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,
     'nativeMenuPetOnlyVerified':True,'nativeSettingsWindowVerified':True,
     'nativeSettingsLive2DReadyObserved':True,'nativeSettingsExtrasCollapsed':True,
     'crossApplicationInputCountersVerified':True,
     'nativeInputObserved':{'baseline':{'left':0,'right':0,'special':0,'mouse':0},
                            'after':{'left':1,'right':1,'special':0,'mouse':0},
                            'source':'Sky automated A and J in Explorer; actual Windows hook delivery counters refreshed in native settings',
                            'physicalHardwareTypingVerified':False},
     'nativeIdleGesturesVisuallyVerified':False,'installerInstallUninstallVerified':False,
     'completeWindowsAcceptance':False,'formalArtComplete':False,
     'sourceSha256':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest().upper() for f in files},
     'artifacts':json.loads((ROOT/'deliveries/20261007-desktop-0.6.0/SHA256.json').read_text(encoding='utf-8-sig'))}
(evidence/'windows-verification-status.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Actual Windows launch, native Live2D-ready settings, and cross-app counters recorded for 0.6.0')
