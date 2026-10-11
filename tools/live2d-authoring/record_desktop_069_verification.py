"""Record saved observations; do not manufacture native acceptance from browser QA."""
import hashlib
import json
import sqlite3
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FOLDER = HERE / 'build/desktop-0.6.9-ui-20261006'

def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

assert load(ROOT / 'package.json')['version'] == '0.6.9'
artifacts = load(ROOT / 'deliveries/20261011-desktop-0.6.9/SHA256.json')
for row in artifacts:
    assert sha(ROOT / 'deliveries/20261011-desktop-0.6.9' / row['file']) == row['sha256']
clock = load(HERE / 'build/app-animation-clock-20261011/verification.json')
assert clock['pass'] and clock['appVersion'] == '0.6.9'
assert all(sha(ROOT / file) == digest for file, digest in clock['sourceSha256'].items())
initial = load(FOLDER / 'native-original-settings.json')
scaled = load(FOLDER / 'native-scaled-settings.json')
assert scaled['scale'] == 1.37
assert {k: v for k, v in initial.items() if k != 'scale'} == {k: v for k, v in scaled.items() if k != 'scale'}
assert 'Value: 137 ID: pet-size' in (FOLDER / 'native-scale-137.txt').read_text(encoding='utf-8')
final_text = (FOLDER / 'native-final-settings-100.txt').read_text(encoding='utf-8')
assert 'Live2D 已加载' in final_text and 'Value: 100 ID: pet-size' in final_text
db = Path.home() / 'AppData/Roaming/local.changli.companion/companion.sqlite3'
with sqlite3.connect(f'file:{db.as_posix()}?mode=ro', uri=True) as connection:
    final_settings = json.loads(connection.execute('SELECT json FROM state WHERE id=1').fetchone()[0])['settings']
assert final_settings['scale'] == 1
assert {k: v for k, v in initial.items() if k != 'scale'} == {k: v for k, v in final_settings.items() if k != 'scale'}
(FOLDER / 'native-final-settings.json').write_text(json.dumps(final_settings, indent=2) + '\n', encoding='utf-8')
# Accessibility can precede the captured frame; the saved native screenshots
# are the visual evidence for A/F, not an assumed synchronized UIA label.
images = ['native-launch.png', 'native-menu.png', 'native-expression-smile.png',
    'native-external-mouse.png', 'native-external-key-a.png', 'native-rapid-keys.png',
    'native-mouse-to-key.png', 'native-blink-review.png', 'native-idle-02.png',
    'native-idle-03.png', 'native-idle-04.png', 'native-scale-137.png',
    'native-pet-137.png', 'native-reopened-137.png', 'native-reopened-settings-137.png',
    'native-phoenix-playing.png', 'native-phoenix-restored.png',
    'native-final-100.png', 'native-final-settings-100.png']
assert all((FOLDER / image).is_file() for image in images)
report = {
    'savedAt': datetime.now().astimezone().isoformat(), 'appVersion': '0.6.9', 'nativeVersion': 71,
    'nativeBuildExitCode': 0, 'nativeLaunchVerified': True, 'nativeTransparentPetVisible': True,
    'nativeSettingsLoaded': True, 'nativeAutomaticBlinkObserved': True,
    'nativeBlinkEvidence': 'native-idle-02/03/04: open, closing, restored; full closed hold verified separately in real App/Core.',
    'actualAppContinuousAnimationVerified': True,
    'actualAppClockUpdatesIn12Seconds': clock['updates'],
    'nativeGlobalMouseAndKeyboardObserved': True, 'nativeRapidKeysAndMouseToKeyboardObserved': True,
    'independentHandsGeometryVerifiedInSdk': True,
    'nativeSmileAndDefaultObserved': True, 'nativePhoenixInteractionInvoked': True,
    'nativeScale137SaveAndRestartVerified': True,
    'nativeSizeMetadata': {'original94': {'width': 339, 'height': 301},
        'scaled137': {'width': 493, 'height': 439}, 'reopened137': {'width': 493, 'height': 439},
        'current100': {'width': 360, 'height': 320}},
    'otherSettingsPreserved': True, 'currentUserScalePreserved': 1,
    'settingsNote': 'On resume at12:29, user state was already100%, replacing the earlier94% baseline and137% test. Preserve100%; do not force94%.',
    'installerGenerated': True, 'installerInstallUninstallVerified': False,
    'multiDpiVerified': False, 'multiMonitorVerified': False,
    'completeWindowsAcceptance': False, 'formalArtComplete': False,
    'sourceSha256': {file: sha(ROOT / file) for file in clock['sourceSha256']},
    'artifacts': artifacts,
    'proofImages': [{'file': image, 'sha256': sha(FOLDER / image)} for image in images],
}
(FOLDER / 'windows-verification-status.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Windows0.6.9 observations recorded; current user100% preserved; installation/multiDPI/final art remain unverified.')
