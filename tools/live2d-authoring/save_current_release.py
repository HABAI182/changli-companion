"""Save committed current source, binaries and evidence without local secrets.

Keep prior recovery packages; do not collect app databases, compiler caches or
historical releases. Native work not promoted is retained in prior recovery.
"""
import hashlib
import json
import subprocess
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / 'tools/live2d-authoring'
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def main():
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT).strip():
        raise ValueError('Commit intended source first')
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0')
    files = [ROOT / p for p in tracked if p]
    files += [ROOT / 'PROGRESS-CHECKPOINT-20261011.md']
    for directory in (ROOT / ('deliveries/20261011-desktop-' + VERSION),
                      HERE / ('build/expressive-' + VERSION + '-20261011'),
                      HERE / ('build/interactions-' + VERSION + '-20261011'),
                      HERE / ('build/installer-' + VERSION + '-20261011')):
        files += [p for p in directory.glob('*') if p.is_file() and p.suffix in ('.json', '.png', '.exe')
                  and p.name != 'changli-companion-fullscreen-test.exe']
    previous = HERE / 'build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json'
    previous_info = json.loads(previous.read_text(encoding='utf-8')) if previous.exists() else None
    now = datetime.now().astimezone()
    folder = HERE / 'build/current-release'
    folder.mkdir(exist_ok=True)
    archive = folder / ('changli-' + VERSION + '-recovery-' + now.strftime('%Y%m%d-%H%M%S') + '.zip')
    manifest = {'savedAt': now.isoformat(), 'appVersion': VERSION, 'nativeVersion': 71,
                'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip(),
                'formalArtComplete': False, 'previousNativeWorkingRecovery': previous_info, 'files': []}
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED, compresslevel=3) as out:
        for p in sorted(set(files)):
            rel = p.resolve().relative_to(ROOT.resolve()).as_posix()
            if not p.is_file() or p.suffix in ('.sqlite3', '.sqlite', '.log'):
                raise ValueError('Unexpected recovery member: ' + rel)
            manifest['files'].append({'path': rel, 'bytes': p.stat().st_size, 'sha256': sha(p)})
            out.write(p, rel)
        out.writestr('RECOVERY-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
        out.writestr('恢复说明.txt', '解压后先读取DELIVERY-' + VERSION + '.md与PROGRESS-CHECKPOINT-20261011.md。\n'
                     '当前可运行桌宠与已验证v71原生源已保存；未晋升的原生工作源在上一份恢复包中，不冒充发布模型。\n'
                     '依赖安装npm ci，开发npm run desktop，打包npm run package:windows。\n')
    with zipfile.ZipFile(archive) as check:
        if check.testzip() or json.loads(check.read('RECOVERY-MANIFEST.json')) != manifest:
            raise ValueError('Recovery integrity failed')
    pointer = {'archive': str(archive), 'sha256': sha(archive), 'bytes': archive.stat().st_size,
               'crcVerified': True, 'appVersion': VERSION, 'commit': manifest['commit'],
               'formalArtComplete': False, 'previousNativeWorkingRecovery': previous_info}
    temp = folder / 'LATEST-RECOVERY.tmp'
    temp.write_text(json.dumps(pointer, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(folder / 'LATEST-RECOVERY.json')
    print(json.dumps(pointer, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
