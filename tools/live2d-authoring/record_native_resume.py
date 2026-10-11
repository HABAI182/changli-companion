"""Record observed access recovery without upgrading unperformed acceptance."""
import hashlib,json
from pathlib import Path
from datetime import datetime
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
folder=HERE/'build/desktop-0.6.7-ui-20261006'
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
status=json.loads((folder/'windows-verification-status.json').read_text(encoding='utf-8'))
observation=(folder/'native-permission-restored-settings.txt').read_text(encoding='utf-8')
assert 'Value: 94 ID: pet-size' in observation and 'Live2D 已加载' in observation
status.update(savedAt=datetime.now().astimezone().isoformat(),toolControlBlockedOnContinuation=[],
    previousToolControlBlocks=status.get('toolControlBlockedOnContinuation',[]),
    nativeControlRecovered=True,latestObservedScale=.94,restoreInitialScalePending=False,
    scaleRestorationNote='Native UI on Oct9 already showed94%; kept current user preference. No forced93% write performed.',
    nativeScaleAndRestartThisBuildVerified=False)
write(folder/'windows-verification-status.json',status)
plan_path=HERE/'build/v69-native-plan-20261009.json'
plan=json.loads(plan_path.read_text(encoding='utf-8'))
source=HERE/'ChangliReferenceRepair-v69-candidate.cmo3'
digest=hashlib.sha256(source.read_bytes()).hexdigest().upper()
plan.update(nativeEdited=digest!=plan['candidateSourceSha256'],currentSourceSha256=digest,
    officialExportExists=(HERE/'build/editor-export-reference-repair-v69-20261006/ChangliReferenceRepairV69.moc3').is_file(),
    nativeEdits='Only closed endpoints of Warp6/Warp5 translated down17/23 pixels at65.2% Editor zoom on Oct9.',
    verificationPending=True)
write(plan_path,plan)
release=HERE/'build/input-blink-20261008/release-status.json'
d=json.loads(release.read_text(encoding='utf-8'))
d.update(blockers=[],next='Officially export and validate savedv69 closed-endpoint alignment; published desktop remains0.6.7/v68.',nativeControlRecovered=True)
write(release,d)
print('Access recovery and nativev69 edits recorded; full Windows/art acceptance remains pending.')
