"""Archive saved files only; never claims to save Cubism's in-memory state."""
import hashlib
import json
import zipfile
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    info = json.loads((HERE / 'build/desktop-integration-20261005/LATEST-RECOVERY.json').read_text(encoding='utf-8'))
    native = info['nativeWorkingRecovery']
    working = HERE / 'ChangliReferenceRepair-v32-candidate.cmo3'
    snapshot = HERE / native['latestWorkingSnapshot']
    if sha(working) != native['workingSha256'] or sha(snapshot) != native['workingSha256']:
        raise ValueError('Saved native v32 source/snapshot changed')
    baseline = Path(info['verifiedNativeSource'])
    if sha(baseline) != info['verifiedNativeSha256']:
        raise ValueError('Verified v31 source changed')
    code = Path(info['implementationArchive'])
    with zipfile.ZipFile(code) as z:
        if z.testzip() or json.loads(z.read('RECOVERY-MANIFEST.json')) != info:
            raise ValueError('Code recovery archive mismatch')
    delivery = ROOT / 'deliveries/20261005-v31-gaze-0.5.7-candidate'
    for row in json.loads((delivery / 'SHA256.json').read_text(encoding='utf-8')):
        if sha(delivery / row['file']) != row['sha256']:
            raise ValueError('Windows package changed')
    files = [working, baseline, HERE / 'ChangliReferenceRepair-v31-candidate.cmo3', code,
             ROOT / 'PROGRESS-CHECKPOINT-20261005.md', HERE / 'HAIR-TAIL-PROGRESS.md',
             HERE / 'build/LATEST-RECOVERY-20261005.json',
             HERE / 'build/desktop-integration-20261005/LATEST-RECOVERY.json',
             HERE / 'references/changli-original-current.png', Path(__file__),
             HERE / 'build/gaze-correction-status-20261005.json',
             ROOT / 'public/models/changli/live-reference-repair-v30-candidate/ChangliReferenceRepairV30.moc3']
    for directory in [delivery, ROOT / 'public/models/changli/live-reference-repair-v31-candidate',
                      ROOT / 'vendor/live2d', ROOT / 'public/vendor/live2d',
                      HERE / 'build/gaze-cutout-v31-20261005']:
        files += [p for p in directory.rglob('*') if p.is_file()]
    now = datetime.now().astimezone()
    archive = HERE / f'build/desktop-integration-20261005/full-gaze-recovery-{now:%Y%m%d-%H%M%S}.zip'
    manifest = {'savedAt': now.isoformat(), 'formalArtComplete': False,
                'native32OfficialExportVerified': False, 'publishedModelVersion': 31,
                'appVersion': '0.5.7', 'nativeWindowsLaunchVerified': False,
                'native32SavedSha256': native['workingSha256'], 'files': []}
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED, compresslevel=3) as z:
        for file in sorted(set(files)):
            relative = file.relative_to(ROOT).as_posix()
            manifest['files'].append({'path': relative, 'bytes': file.stat().st_size, 'sha256': sha(file)})
            z.write(file, relative)
        z.writestr('FULL-RECOVERY-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        z.writestr('恢复说明.txt',
            '全部路径相对于 outputs/changli。先解压完整恢复包，再解压其中 implementation-checkpoint 恢复包到同一根目录。\n'
            'Cubism 继续打开 tools/live2d-authoring/ChangliReferenceRepair-v32-candidate.cmo3。这是原生已保存眼部校准工作源，尚未官方导出。\n'
            'v31 verified-native 是上次通过 Core 的源文件；另外保留未覆盖的 v31-candidate，二者哈希不同，不要混称同一恢复点。\n'
            '0.5.7 包含新的位置跟随和平滑代码，仍加载已通过的 v31；锁屏导致本次 Windows 实际启动未验证。\n'
            '两眼短端点行程、缺角与抠图仍待原生修正；正式美术未完工。详情见进度记录和状态 JSON。\n')
    with zipfile.ZipFile(archive) as z:
        if z.testzip() or json.loads(z.read('FULL-RECOVERY-MANIFEST.json')) != manifest:
            raise ValueError('Full recovery integrity failed')
    latest = {'archive': str(archive), 'bytes': archive.stat().st_size, 'sha256': sha(archive),
              'entries': len(manifest['files']), 'crcVerified': True,
              'native32SavedSha256': native['workingSha256'], 'formalArtComplete': False}
    (HERE / 'build/desktop-integration-20261005/FULL-RECOVERY.json').write_text(
        json.dumps(latest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(latest, ensure_ascii=False))


if __name__ == '__main__':
    main()
