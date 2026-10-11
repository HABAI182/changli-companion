"""Persist the observations actually made in delivered Windows 0.6.1."""
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
folder = HERE / 'build/desktop-0.6.1-ui-20261006'
before = (folder / 'native-input-baseline.txt').read_text(encoding='utf-8')
after = (folder / 'native-input-observation.txt').read_text(encoding='utf-8')
def counters(text):
    match = re.search(r'左键区 (\d+)、右键区 (\d+)、特殊键 (\d+)、鼠标 (\d+)', text)
    if not match: raise ValueError('Native counter text missing')
    return dict(zip(('left', 'right', 'special', 'mouse'), map(int, match.groups())))
baseline, observed = counters(before), counters(after)
if observed['left'] - baseline['left'] != 1 or observed['right'] - baseline['right'] != 1 or 'Live2D 已加载' not in after:
    raise ValueError('Native input/load observations do not match this recorded run')
images = ('native-touch-closed.png', 'native-touch-restored.png', 'native-menu.png',
          'native-shortcut-smile-held.png', 'native-shortcut-default-restored.png',
          'native-settings-loaded.png', 'native-settings-collapsed.png', 'native-input-counters.png')
if any(not (folder / f).is_file() for f in images): raise ValueError('Missing native visual proof')
files = ('src/App.tsx', 'src/style.css', 'src/pet/presentation.ts',
         'src/renderer/live2d/Live2DAdapter.ts', 'src-tauri/src/input.rs',
         'public/models/changli/model.json', 'vite.config.ts')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
artifacts = json.loads((ROOT / 'deliveries/20261007-desktop-0.6.1/SHA256.json').read_text(encoding='utf-8-sig'))
for row in artifacts:
    if sha(ROOT / 'deliveries/20261007-desktop-0.6.1' / row['file']) != row['sha256']:
        raise ValueError('Delivered artifact changed after native observation')
doc = {
    'savedAt': datetime.now().astimezone().isoformat(), 'appVersion': '0.6.1', 'candidate': 55,
    'buildExitCode': 0, 'nativeLaunchVerified': True, 'nativeTransparentPetVisible': True,
    'nativeMenuPetOnlyVerified': True, 'nativeSettingsWindowVerified': True,
    'nativeSettingsLive2DReadyObserved': True, 'nativeSettingsExtrasCollapsed': True,
    'nativeTouchSmileClosedAndRestoredObserved': True,
    'nativeDefaultMenuResetsHeldShortcutExpressionObserved': True,
    'crossApplicationInputCountersVerified': True,
    'nativeInputObserved': {
        'baseline': baseline,
        'after': observed,
        'source': 'Sky automated A and J in Explorer, with actual native settings counters refreshed afterwards',
        'physicalHardwareTypingVerified': False,
    },
    'nativeIdleGesturesVisuallyVerified': False, 'installerInstallUninstallVerified': False,
    'completeWindowsAcceptance': False, 'formalArtComplete': False,
    'sourceSha256': {f: sha(ROOT / f) for f in files}, 'artifacts': artifacts,
    'proofImages': [{'file': f, 'sha256': sha(folder / f)} for f in images],
    'productionPayloadMiB': round(sum(p.stat().st_size for p in (ROOT / 'dist').rglob('*') if p.is_file()) / 1048576, 2),
    'productionOnlyActiveModel': sorted(p.name for p in (ROOT / 'dist/models/changli').iterdir() if p.is_dir() and p.name.startswith('live-')) == ['live-reference-repair-v55-candidate'],
}
(folder / 'windows-verification-status.json').write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Windows 0.6.1: actual launch, native model load/touch/menu/settings and cross-app input recorded. Installer/hardware/full art acceptance remain pending.')
