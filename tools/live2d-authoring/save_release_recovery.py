"""Create a complete current-state recovery without duplicating old releases."""
import hashlib
import json
import re
import zipfile
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
folder=HERE/'build/desktop-integration-20261006'
info=json.loads((folder/'LATEST-RECOVERY.json').read_text(encoding='utf-8'))
native=info['nativeWorkingRecovery']
version=int(info['modelEntry'].split('live-reference-repair-v',1)[1].split('-',1)[0])
app_version=info['appVersion']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
working_version=int(re.search(r'-v(\d+)-',native['latestWorkingSnapshot'])[1])
working=HERE/f'ChangliReferenceRepair-v{working_version}-candidate.cmo3'
if sha(working)!=native['workingSha256']:raise ValueError('Native source changed')
code=Path(info['implementationArchive'])
with zipfile.ZipFile(code) as z:
    if z.testzip():raise ValueError('Code archive CRC failed')
    for member in z.infolist():
        if member.is_dir() or member.filename=='RECOVERY-MANIFEST.json':continue
        current=(ROOT/member.filename).resolve()
        if not current.is_relative_to(ROOT.resolve()) or not current.is_file():
            raise ValueError('Code archive resource missing or outside project: '+member.filename)
        if hashlib.sha256(z.read(member)).hexdigest().upper()!=sha(current):
            raise ValueError('Code archive is stale; save_desktop_progress first: '+member.filename)
files=[working,HERE/native['latestWorkingSnapshot'],Path(info['verifiedNativeSource']),code,
       folder/'LATEST-RECOVERY.json',HERE/'build/LATEST-RECOVERY-20261006.json',
       ROOT/'PROGRESS-CHECKPOINT-20261006.md',HERE/'HAIR-TAIL-PROGRESS.md']
files += list(HERE.glob('*.psd'))
files += [HERE/'assets/changli-original-clean-alpha-v1.png',HERE/'assets/keyboard-facing-character-v1.png',
          ROOT/'PROGRESS-CHECKPOINT-20261008.md']
files += [p for p in HERE.iterdir() if p.is_file() and p.suffix in ('.py','.js','.cjs','.html','.md')]
# Regression checks need only the old official MOC3 geometry, not another
# complete copy of the old textures/releases. The staging template needs its
# JSON, expression/motion files and physics; preserve exactly those dependencies.
for baseline in (52, 54, *([55] if version >= 56 else []), *([56] if working_version >= 57 else []), *([58] if working_version >= 59 else []), *([59] if working_version >= 60 else []), *([60] if working_version >= 61 else []), *([64] if working_version >= 66 else []), *([70] if working_version >= 71 else [])):
    files += [ROOT / f'public/models/changli/live-reference-repair-v{baseline}-candidate/ChangliReferenceRepairV{baseline}.moc3']
template = ROOT / 'public/models/changli/live-left-ornament-v1-candidate'
template_manifest = template / 'ChangliLeftOrnamentV1-physics.model3.json'
refs = json.loads(template_manifest.read_text(encoding='utf-8'))['FileReferences']
files += [template_manifest, template / refs['Physics']]
files += [template / row['File'] for row in refs['Expressions']]
files += [template / row['File'] for rows in refs['Motions'].values() for row in rows]
for directory in [ROOT/f'public/models/changli/live-reference-repair-v{version}-candidate',
                  ROOT/'public/models/changli/assets',ROOT/'public/assets',ROOT/'vendor/live2d',ROOT/'public/vendor/live2d',
                  HERE/f'build/editor-export-reference-repair-v{version}-20261006',
                  HERE/f'build/desktop-v{version}-integration-20261006',HERE/f'build/desktop-{app_version}-ui-20261006',
                  HERE/f'build/art-review-v{version}-20261007',HERE/f'build/keyboard-tail-v{version}-20261008',ROOT/f'deliveries/20261007-desktop-{app_version}',
                  ROOT/f'deliveries/20261008-desktop-{app_version}',HERE/f'build/neck-seam-v{version}-20261008',HERE/'references']:
    if directory.exists():files += [p for p in directory.rglob('*') if p.is_file() and '.git' not in p.parts]
files += [p for p in HERE.joinpath('build').glob(f'*v{version}*.json')]
files += [p for p in HERE.joinpath('build/input-blink-20261008').glob('*.json')]
files += [ROOT/'PROGRESS-CHECKPOINT-20261009.md',ROOT/'PROGRESS-CHECKPOINT-20261011.md']
files += [HERE/'ChangliReferenceRepair-v69-candidate.cmo3',HERE/'build/v69-native-plan-20261009.json']
for directory in (HERE/'build/source-audit-v61-20261009',HERE/'build/source-audit-v65-20261009',HERE/'build/input-blink-20261008'):
    if directory.exists():files += [p for p in directory.iterdir() if p.is_file()]
files += list(HERE.joinpath('build').glob('blink-v*-*-20261009.*'))
files += list(HERE.joinpath('build').glob('blink-v*-*-20261011.*'))
for directory in (ROOT/f'deliveries/20261011-desktop-{app_version}',HERE/'build/input-blink-v70-20261011',HERE/'build/input-blink-v71-20261011'):
    if directory.exists():files += [p for p in directory.rglob('*') if p.is_file()]
for directory in (HERE/'build/app-animation-clock-20261011', HERE/'build/desktop-0.6.8-ui-20261006', HERE/f'build/interactions-{app_version}-20261011'):
    if directory.exists():files += [p for p in directory.rglob('*') if p.is_file()]
art_motion = HERE/f'build/art-motion-{app_version}-20261011'
if art_motion.exists():files += [p for p in art_motion.iterdir() if p.is_file()]
for directory in (ROOT/f'deliveries/20261009-desktop-{app_version}',HERE/'build/settings-ui-20261009'):
    if directory.exists():files += [p for p in directory.rglob('*') if p.is_file()]
files += list(HERE.joinpath('build').glob('settings-ui-*-20261009.txt'))
files += list(HERE.joinpath('build').glob('input-blink-*-20261009.txt'))
files += list(HERE.joinpath('build').glob('input-blink-*-20261008.txt'))
files += [HERE/'vite.input-blink.config.ts']
files += list(HERE.joinpath('build').glob(f'desktop-{app_version}-build*.log'))
files += [HERE/'build/ui-0.6.3-tests-20261008.txt']
previous_windows = HERE/'build/desktop-0.6.3-ui-20261006'
if previous_windows.exists():files += [p for p in previous_windows.rglob('*') if p.is_file()]
if working_version != version:
    # Keep the unpromoted work and its previous export distinct from the release.
    # This is recovery coverage, not acceptance of a source/export mismatch.
    files += [HERE/f'build/ChangliReferenceRepair-v{working_version}-20261006.cmo3']
    files += list(HERE.joinpath('build').glob(f'*v{working_version}*.json'))
    files += [p for p in HERE.joinpath('build').glob('*packaging-20261008.json')]
    for directory in (HERE/f'build/editor-export-reference-repair-v{working_version}-20261006',
                      ROOT/f'public/models/changli/live-reference-repair-v{working_version}-candidate',
                      HERE/f'build/keyboard-tail-v{working_version}-20261008'):
        if directory.exists():files += [p for p in directory.rglob('*') if p.is_file()]
files += [ROOT/p for p in (f'DELIVERY-{app_version}.md','README.md','ENGINEERING_HANDOFF.md','THIRD-PARTY-NOTICES.md','CLEANUP-REPORT-20261007.md','FEATURE-OPTIONS-20261011.md')]
archive=folder/f'current-release-recovery-{datetime.now():%Y%m%d-%H%M%S}.zip'
manifest={'appVersion':info['appVersion'],'nativeVersion':version,'nativeWorkingVersion':working_version,'formalArtComplete':False,'files':[]}
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=3) as z:
    for p in sorted(set(files)):
        if not p.is_file():continue
        rel=p.relative_to(ROOT).as_posix()
        manifest['files'].append({'path':rel,'bytes':p.stat().st_size,'sha256':sha(p)})
        z.write(p,rel)
    z.writestr('CURRENT-RECOVERY-MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    z.writestr('恢复说明.txt',f'先解压本包，再将 implementation-checkpoint 压缩包解压到同一根目录。\nCubism 继续编辑 tools/live2d-authoring/ChangliReferenceRepair-v{working_version}-candidate.cmo3。\n已发布桌宠为 v{version}；工作版本与旧导出的关系见进度记录，不得认为候选已经通过。\n当前桌宠、官方模型、可编辑源工程和验证记录完整保留。正式美术尚未全部完成。\n')
with zipfile.ZipFile(archive) as z:
    if z.testzip() or json.loads(z.read('CURRENT-RECOVERY-MANIFEST.json'))!=manifest:
        raise ValueError('Recovery integrity failed')
result={'archive':str(archive),'sha256':sha(archive),'bytes':archive.stat().st_size,'crcVerified':True,'appVersion':app_version,'nativeVersion':version,'nativeWorkingVersion':working_version,'formalArtComplete':False}
for pointer in ('CURRENT-RELEASE-RECOVERY.json','FULL-RECOVERY.json'):
    target=folder/pointer
    temporary=target.with_suffix('.tmp')
    temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temporary.replace(target)
print(json.dumps(result,ensure_ascii=True))
