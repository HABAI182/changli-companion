"""Inventory only: verify recovery and write explicit disposable paths."""
import hashlib
import json
import os
import re
import shutil
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=ROOT.parents[1]
AUTHOR=ROOT/'tools/live2d-authoring'
BUILD=AUTHOR/'build'
RECOVERY=BUILD/'desktop-integration-20261006'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
current=json.loads((RECOVERY/'CURRENT-RELEASE-RECOVERY.json').read_text(encoding='utf-8'))
latest=json.loads((RECOVERY/'LATEST-RECOVERY.json').read_text(encoding='utf-8'))
archive=Path(current['archive'])
if sha(archive)!=current['sha256']:raise ValueError('Current recovery SHA256 mismatch')
with zipfile.ZipFile(archive) as z:
    if z.testzip():raise ValueError('Current recovery CRC failure')
    source='tools/live2d-authoring/ChangliReferenceRepair-v54-candidate.cmo3'
    if hashlib.sha256(z.read(source)).hexdigest().upper()!=latest['verifiedNativeSha256']:
        raise ValueError('Recovery native source mismatch')
    for row in json.loads((ROOT/'deliveries/20261007-desktop-0.6.0/SHA256.json').read_text(encoding='utf-8-sig')):
        p=ROOT/'deliveries/20261007-desktop-0.6.0'/row['file']
        if sha(p)!=row['sha256'] or hashlib.sha256(z.read(p.relative_to(ROOT).as_posix())).hexdigest().upper()!=row['sha256']:
            raise ValueError('Current delivery mismatch')

protected={archive.resolve(),Path(latest['implementationArchive']).resolve(),
           Path(latest['verifiedNativeSource']).resolve(),
           AUTHOR/latest['nativeWorkingRecovery']['latestWorkingSnapshot'],
           AUTHOR/'ChangliReferenceRepair-v54-candidate.cmo3',
           AUTHOR/'ChangliReferenceRepair-v52-candidate.cmo3',
           BUILD/'ChangliReferenceRepair-v54-20261006.cmo3',
           BUILD/'ChangliReferenceRepair-v52-20261006.cmo3',
           BUILD/'ChangliReferenceRepair-v52-user-latest-20261007-1831.cmo3'}
protected={p.resolve() for p in protected}
protected_dirs=[ROOT/'deliveries/20261007-desktop-0.6.0',
                ROOT/'public/models/changli/live-left-ornament-v1-candidate',
                ROOT/'public/models/changli/live-reference-repair-v54-candidate',
                ROOT/'public/models/changli/live-reference-repair-v52-candidate',
                BUILD/'editor-export-reference-repair-v54-20261006',
                BUILD/'editor-export-reference-repair-v52-20261006',
                BUILD/'desktop-0.6.0-ui-20261006',BUILD/'art-review-v54-20261007',
                BUILD/'desktop-v54-integration-20261006']
protected_dirs=[p.resolve() for p in protected_dirs]
items={}
def add(p,reason):
    if not p.exists():return
    absolute=p.resolve()
    if not absolute.is_relative_to(WORKSPACE.resolve()) or absolute==WORKSPACE.resolve() or absolute==ROOT.resolve():
        raise ValueError('Unsafe cleanup boundary: '+str(p))
    if p.is_symlink() or (hasattr(os.path,'isjunction') and os.path.isjunction(p)):
        raise ValueError('Reparse target rejected: '+str(p))
    if any(absolute==q or q.is_relative_to(absolute) for q in protected):return
    if any(absolute==q or absolute.is_relative_to(q) or q.is_relative_to(absolute) for q in protected_dirs):return
    items[absolute]=reason

add(ROOT/'src-tauri/target','regenerable Rust build cache')
add(ROOT/'dist','regenerable frontend build copy')
for p in (ROOT/'deliveries').iterdir():
    if p.is_dir() and p.name!='20261007-desktop-0.6.0':add(p,'superseded application delivery')
for p in (ROOT/'public/models/changli').iterdir():
    if p.is_dir() and p.name.startswith('live') and p.name not in ('live-reference-repair-v52-candidate','live-reference-repair-v54-candidate'):
        add(p,'unused historical exported model')
for p in AUTHOR.glob('ChangliReferenceRepair-v*-candidate.cmo3'):
    if re.search(r'-v(\d+)-',p.name)[1] not in ('52','54'):add(p,'superseded integrated native source')
for p in BUILD.rglob('*.cmo3'):add(p,'superseded native snapshot')
for p in BUILD.rglob('*.zip'):
    if re.match(r'(full-|implementation-checkpoint-|current-release-recovery-)',p.name):add(p,'superseded or incomplete recovery archive')
for p in BUILD.iterdir():
    if not p.is_dir():continue
    if p.name.startswith('editor-export'):add(p,'superseded official export copy')
    elif re.match(r'(art-review-v|contour-audit-v|cuff-attachment-v|gaze-cutout-v|desktop-v)',p.name):
        if not re.search(r'-v(52|54)-',p.name):add(p,'historical rendered QA images; JSON reports retained elsewhere')
    elif re.match(r'desktop-0\.',p.name) and not p.name.startswith('desktop-0.6.0-'):
        add(p,'historical executable UI evidence; latest evidence retained')
for p in BUILD.glob('*.png'):
    if not re.search(r'-v(52|54)-',p.name):add(p,'historical rendered QA screenshot')

selected=[]
for p in sorted(items,key=lambda p:len(p.parts)):
    if any(p.is_relative_to(q) for q in selected):continue
    selected.append(p)
rows=[]
groups=defaultdict(int)
for p in selected:
    if p.is_dir():
        descendants=list(p.rglob('*'))
        if any(q.is_symlink() or (hasattr(os.path,'isjunction') and os.path.isjunction(q)) for q in descendants):
            raise ValueError('Nested reparse point: '+str(p))
        count=sum(q.is_file() for q in descendants)
        size=sum(q.stat().st_size for q in descendants if q.is_file())
    else:count,size=1,p.stat().st_size
    rows.append({'path':str(p),'relative':p.relative_to(WORKSPACE).as_posix(),'reason':items[p],'bytes':size,'files':count})
    groups[items[p]]+=size
plan={'createdAt':datetime.now().astimezone().isoformat(),'workspace':str(WORKSPACE),
      'freeBytesBefore':shutil.disk_usage(WORKSPACE).free,'currentRecoveryVerified':current,
      'protectedFiles':sorted(map(str,protected)),'protectedDirectories':list(map(str,protected_dirs)),
      'totalBytes':sum(row['bytes'] for row in rows),'paths':rows}
(ROOT/'CLEANUP-PLAN-20261007.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'paths':len(rows),'reclaimGiB':round(plan['totalBytes']/2**30,2),
                  'groupsGiB':{k:round(v/2**30,2) for k,v in groups.items()},'currentRecoveryCrcVerified':True},ensure_ascii=False))
