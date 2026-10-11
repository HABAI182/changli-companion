"""Inventory and recover separate historical versions without changing main.

Restored source tags come from saved source checkpoints, never current code.
0.6.3 has binaries but no exact source checkpoint, so gets an archive-only tag.
GitHub releases are immutable: existing asset digests must match; no clobber.
"""
import argparse
import hashlib
import io
import json
import re
import shutil
import subprocess
import time
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GH = ROOT / 'tools/github-upload/bin/gh/bin/gh.exe'
LOCAL = ROOT / 'tools/github-upload/local/version-archives'
BUILD = ROOT / 'tools/live2d-authoring/build/desktop-integration-20261006'
REPO = 'HABAI182/changli-companion'
INDEX = ROOT / 'archives/versions.json'

def cmd(args, check=True):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', check=check)

def gh(*args):
    return cmd([str(GH), *args]).stdout.strip()

def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest().upper()

def encode(v):
    return (json.dumps(v, ensure_ascii=False, indent=2) + '\n').encode('utf-8')

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encode(data))

def inventory():
    snapshots, full = {}, {}
    for path in sorted(BUILD.glob('implementation-checkpoint-*.zip')):
        with zipfile.ZipFile(path) as z:
            version = json.loads(z.read('package.json'))['version']
            snapshots[version] = path
    for path in sorted(BUILD.glob('current-release-recovery-*.zip')):
        with zipfile.ZipFile(path) as z:
            info = json.loads(z.read('CURRENT-RECOVERY-MANIFEST.json'))
            full[info['appVersion']] = path
    # v0.6.8 has an exact source checkpoint and the same verified v71 native
    # source as v0.6.9; record this explicit resource recovery relationship.
    full['0.6.8'] = full['0.6.9']
    records = []
    for directory in sorted((ROOT / 'deliveries').glob('*-desktop-*')):
        version = directory.name.split('desktop-')[1]
        if not re.fullmatch(r'\d+\.\d+\.\d+', version):
            raise ValueError('Unexpected version directory')
        hashes_file = directory / 'SHA256.json'
        previous = json.loads(hashes_file.read_text(encoding='utf-8-sig')) if hashes_file.exists() else []
        artifacts = []
        for p in sorted(directory.glob('*.exe')):
            digest = sha(p)
            if previous and not any(row['sha256'] == digest for row in previous):
                raise ValueError('Saved artifact checksum mismatch: ' + str(p))
            name = 'changli-companion.exe' if p.name == 'changli-companion.exe' else 'changli-companion-' + version + '-x64-setup.exe'
            artifacts.append({'file': name, 'localPath': p.relative_to(ROOT).as_posix(),
                              'bytes': p.stat().st_size, 'sha256': digest})
        if len(artifacts) != 2:
            raise ValueError('Expected portable EXE and setup: ' + version)
        tag = 'archive-v' + version if version == '0.6.3' else 'v' + version
        row = {'version': version, 'tag': tag, 'releaseUrl': 'https://github.com/' + REPO + '/releases/tag/' + tag,
               'localDelivery': directory.relative_to(ROOT).as_posix(), 'artifacts': artifacts,
               'historicalValidationRepeated': False, 'formalArtComplete': False}
        if version in snapshots:
            p = snapshots[version]
            with zipfile.ZipFile(p) as z:
                recovery = json.loads(z.read('RECOVERY-MANIFEST.json'))
                assert recovery['appVersion'] == version
            row['source'] = {'status': 'saved-checkpoint', 'checkpoint': p.relative_to(ROOT).as_posix(),
                             'checkpointSha256': sha(p), 'resourceRecovery': full[version].relative_to(ROOT).as_posix(),
                             'resourceRecoveryVersion': '0.6.9' if version == '0.6.8' else version,
                             'resourceRecoverySha256': sha(full[version]),
                             'nativeSourceSha256': recovery['verifiedNativeSha256'],
                             'modelEntry': recovery['modelEntry'], 'historicalBinaryRebuildVerified': False}
        elif version == '0.7.4':
            row['source'] = {'status': 'original-git-tag'}
            recovery = ROOT / 'tools/live2d-authoring/build/current-release/LATEST-RECOVERY.json'
            row['recovery'] = json.loads(recovery.read_text(encoding='utf-8'))['archive'].replace(str(ROOT) + '\\', '').replace('\\', '/')
        else:
            row['source'] = {'status': 'binary-only', 'reason': 'No exact saved 0.6.3 source checkpoint found; no replacement with newer source.'}
        records.append(row)
    document = {'schema': 1, 'immutable': True, 'repository': 'https://github.com/' + REPO, 'versions': records}
    write(INDEX, document)
    render(document)
    print('Inventoried ' + str(len(records)) + ' independent versions', flush=True)

def render(document):
    rows = ['# 长离桌宠版本留档', '', '每个版本独立保留，旧版本不覆盖。Release中的程序、安装包和SHA256清单对应各自版本。', '',
            '历史源码标签从当时保存的源码检查点恢复，恢复日期不是原开发提交日期，也没有重新构建或重新验收旧版本。0.6.3只有二进制存档；其archive标签只含归档说明，不提供伪造的旧源码。0.6.8使用本版源码检查点，运行模型从使用同一已验证v71原生源的0.6.9恢复包提取，来源单独记录。', '',
            '| 版本 | 独立Release | 源码情况 | 本地程序目录 |', '| --- | --- | --- | --- |']
    if document.get('githubArchiveVerified'):
        rows[4:4] = ['已核对全部' + str(len(document['versions'])) + '个独立Release的程序、安装包及远端SHA256摘要。', '']
    for row in reversed(document['versions']):
        status = row['source']['status']
        source = '原Git标签' if status == 'original-git-tag' or row['version'] == '0.7.3' else '已保存源码检查点' if status == 'saved-checkpoint' else '**仅二进制；源码缺失**'
        rows.append('| ' + row['version'] + ' | [' + row['tag'] + '](' + row['releaseUrl'] + ') | ' + source + ' | `' + row['localDelivery'] + '` |')
    rows += ['', '机器可读索引：[archives/versions.json](archives/versions.json)。大体积原生源与完整恢复包保留现有本地副本，不为索引重复复制。', '',
             '以后发布必须使用新版本号和独立目录；旧tag不移动、Release附件不覆盖、不删除旧版本。源码与美术的未完成状态以各版交付记录为准。', '']
    (ROOT / 'VERSION-ARCHIVES.md').write_text('\n'.join(rows), encoding='utf-8')

def finalize():
    document = json.loads(INDEX.read_text(encoding='utf-8'))
    complete = json.loads((LOCAL / 'complete.json').read_text(encoding='utf-8'))
    if not complete['pass'] or complete['versionsVerified'] != len(document['versions']):
        raise ValueError('Not all independent releases have been verified')
    for row in document['versions']:
        proof = json.loads((LOCAL / row['version'] / 'published.json').read_text(encoding='utf-8'))
        if not proof['immutableAssetsVerified'] or proof['commit'] != row['sourceCommit'] or proof['tag'] != row['tag']:
            raise ValueError('Incomplete publication evidence: ' + row['version'])
        expected = {a['file']: a['sha256'] for a in row['artifacts']}
        verified = {a['file']: a['sha256'] for a in proof['assets']}
        if len(verified) != 3 or 'SHA256.json' not in verified or not all(verified.get(name) == digest for name, digest in expected.items()):
            raise ValueError('Publication digest evidence differs')
        row['remoteAssetsVerified'] = True
    document['githubArchiveVerified'] = True
    write(INDEX, document)
    render(document)
    print('All independent version archives recorded as verified', flush=True)

def source_files(row):
    source = row['source']
    if source['status'] == 'binary-only':
        return {'README.md': ('# ' + row['version'] + ' 二进制存档\n\n此标签仅保存留档信息，没有完整历史源码。不要将其当作可编译源码版本。\n程序和安装包请在本版本Release下载；原校验值已核对。\n').encode('utf-8')}
    checkpoint = ROOT / source['checkpoint']
    recovery_path = ROOT / source['resourceRecovery']
    if sha(checkpoint) != source['checkpointSha256'] or sha(recovery_path) != source['resourceRecoverySha256']:
        raise ValueError('Historical recovery changed')
    app_files = ('package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts',
                 '.prettierrc.json', '.prettierignore', '.gitignore', 'THIRD-PARTY-NOTICES.md',
                 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json', 'src-tauri/build.rs')
    prefixes = ('src/', 'tests/', 'src-tauri/src/', 'src-tauri/capabilities/', 'src-tauri/icons/')
    model_dir = 'public/models/changli/' + source['modelEntry'].split('/')[0] + '/'
    resources = (model_dir, 'public/models/changli/assets/', 'public/assets/', 'vendor/live2d/', 'public/vendor/live2d/')
    files = {}
    with zipfile.ZipFile(recovery_path) as z:
        manifest = json.loads(z.read('CURRENT-RECOVERY-MANIFEST.json'))
        native = next(p for p in manifest['files'] if p['sha256'] == source['nativeSourceSha256'] and p['path'].endswith('.cmo3'))
        for name in z.namelist():
            if name.startswith(resources) and not name.endswith('/'):
                files[name] = z.read(name)
        native_version = re.search(r'-v(\d+)-', native['path']).group(1)
        files['authoring/ChangliReferenceRepair-v' + native_version + '-verified.cmo3'] = z.read(native['path'])
    with zipfile.ZipFile(checkpoint) as z:
        for name in z.namelist():
            if name in app_files or name.startswith(prefixes) or name.startswith(model_dir) or name == 'public/models/changli/model.json':
                files[name] = z.read(name)
    assert json.loads(files['package.json'])['version'] == row['version']
    entry = json.loads(files['public/models/changli/' + source['modelEntry']])
    refs = entry['FileReferences']
    required = [refs['Moc'], *refs['Textures'], *[r['File'] for r in refs.get('Expressions', [])],
                *[r['File'] for motions in refs.get('Motions', {}).values() for r in motions]]
    required += [refs[k] for k in ['Physics', 'Pose', 'DisplayInfo', 'UserData'] if refs.get(k)]
    missing = [p for p in required if model_dir + p not in files]
    if missing:
        raise ValueError('Incomplete restored model references: ' + str(missing))
    files['README.md'] = ('# 离火长明 ' + row['version'] + ' 历史源码存档\n\n本标签从本版源码检查点和记录的运行资源恢复，不是新版源码的改名副本。\n未重新构建或重新验收；正式美术状态不得推定为完成。\n\n安装依赖：npm ci。开发：npm run desktop。Windows打包：npm run package:windows。\n来源、校验和与原生源关系见ARCHIVED_VERSION.json。原有大体积制作中间文件仍保存在本机完整恢复包中。\n').encode('utf-8')
    return files

def restore_tags():
    document = json.loads(INDEX.read_text(encoding='utf-8'))
    for row in document['versions']:
        tag = row['tag']
        existing = cmd(['git', 'rev-parse', '--verify', 'refs/tags/' + tag], False)
        if existing.returncode == 0:
            if row['version'] in ('0.7.3', '0.7.4'):
                package = json.loads(cmd(['git', 'show', tag + ':package.json']).stdout)
                if package['version'] != row['version']:
                    raise ValueError('Existing source tag has wrong version')
            else:
                saved = json.loads(cmd(['git', 'show', tag + ':ARCHIVED_VERSION.json']).stdout)
                if saved['source'] != row['source'] or saved['artifacts'] != row['artifacts']:
                    raise ValueError('Existing tag content differs; preserve it and use a new version: ' + tag)
            row['sourceCommit'] = cmd(['git', 'rev-parse', tag + '^{commit}']).stdout.strip()
            continue
        files = source_files(row)
        files['ARCHIVED_VERSION.json'] = encode(row)
        if any(name.startswith('/') or '..' in Path(name).parts or len(data) > 100_000_000 for name, data in files.items()):
            raise ValueError('Unsafe path or GitHub oversized historical file')
        ref = 'refs/heads/archive-recovered-' + row['version']
        message = 'Restore ' + row['version'] + ' archive from saved project files; no new historical acceptance\n'
        process = subprocess.Popen(['git', 'fast-import', '--quiet'], cwd=ROOT, stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        def send(s):
            process.stdin.write(s.encode('utf-8'))
        send('commit ' + ref + '\ncommitter HABAI182 <313403513+HABAI182@users.noreply.github.com> ' + str(int(time.time())) + ' +0800\n')
        send('data ' + str(len(message.encode('utf-8'))) + '\n' + message + '\ndeleteall\n')
        for name, content in sorted(files.items()):
            send('M 100644 inline ' + json.dumps(name, ensure_ascii=False) + '\ndata ' + str(len(content)) + '\n')
            process.stdin.write(content)
            send('\n')
        send('\ndone\n')
        process.stdin.close()
        error = process.stderr.read().decode('utf-8', errors='replace')
        if process.wait() != 0:
            raise ValueError('Source archival import failed: ' + error)
        commit = cmd(['git', 'rev-parse', ref]).stdout.strip()
        cmd(['git', 'tag', '-a', tag, commit, '-m', 'Historical version archive recovered from saved checkpoint; no new runtime acceptance'])
        row['sourceCommit'] = commit
        print('Saved ' + tag + ' at ' + commit[:12] + ' (' + str(len(files)) + ' source/resource files)', flush=True)
        write(INDEX, document)
    write(INDEX, document)
    render(document)

def publish():
    actor = gh('api', 'user', '--jq', '.login')
    repo = json.loads(gh('repo', 'view', REPO, '--json', 'isPrivate,owner'))
    if actor != 'HABAI182' or not repo['isPrivate'] or repo['owner']['login'] != actor:
        raise ValueError('Unexpected account or non-private destination')
    if cmd(['git', 'remote', 'get-url', 'origin']).stdout.strip() != 'https://github.com/' + REPO + '.git':
        raise ValueError('Unexpected origin')
    document = json.loads(INDEX.read_text(encoding='utf-8'))
    tags = [row['tag'] for row in document['versions']]
    for row in document['versions']:
        commit = cmd(['git', 'rev-parse', row['tag'] + '^{commit}']).stdout.strip()
        if commit != row['sourceCommit']:
            raise ValueError('Source tag differs from inventory; do not publish')
        if row['version'] not in ('0.7.3', '0.7.4'):
            saved = json.loads(cmd(['git', 'show', row['tag'] + ':ARCHIVED_VERSION.json']).stdout)
            if saved['source'] != row['source'] or saved['artifacts'] != row['artifacts']:
                raise ValueError('Saved version metadata changed; use a new version')
    cmd(['git', 'push', 'origin', *['refs/tags/' + tag for tag in tags]])
    for row in document['versions']:
        version, tag = row['version'], row['tag']
        folder = LOCAL / version
        folder.mkdir(parents=True, exist_ok=True)
        expected = []
        for asset in row['artifacts']:
            src = ROOT / asset['localPath']
            if sha(src) != asset['sha256']:
                raise ValueError('Historical artifact changed: ' + str(src))
            expected.append({k: asset[k] for k in ['file', 'bytes', 'sha256']})
        # Existing published versions retain their original checksum file.
        original_manifest = ROOT / row['localDelivery'] / 'SHA256.json'
        if version == '0.7.3':
            original_manifest = ROOT / 'tools/github-upload/local/release-assets/SHA256.json'
        if version in ('0.7.3', '0.7.4'):
            shutil.copy2(original_manifest, folder / 'SHA256.json')
        else:
            write(folder / 'SHA256.json', expected)
        expected.append({'file': 'SHA256.json', 'bytes': (folder / 'SHA256.json').stat().st_size,
                         'sha256': sha(folder / 'SHA256.json')})
        existing = cmd([str(GH), 'api', 'repos/' + REPO + '/releases/tags/' + tag], False)
        if existing.returncode:
            notes = '历史工程版本 ' + version + '，独立保存程序、安装包与SHA256校验清单。\n\n'
            notes += '仅二进制存档，未找到完整本版源码；本标签只包含存档说明。' if row['source']['status'] == 'binary-only' else '源码标签从本版保存的检查点恢复，包含对应Live2D运行资源及已验证原生源；恢复记录见ARCHIVED_VERSION.json。'
            notes += '\n\n本次核对的是存档完整性，未重新构建、运行或验收旧版本。此版本并非最新推荐版本；未宣称正式美术完成。'
            (folder / 'release-notes.md').write_text(notes, encoding='utf-8')
            gh('release', 'create', tag, '--repo', REPO, '--target', row['sourceCommit'],
               '--title', '离火长明 ' + version + ' 历史存档', '--prerelease', '--latest=false',
               '--notes-file', str(folder / 'release-notes.md'))
        release = json.loads(gh('api', 'repos/' + REPO + '/releases/tags/' + tag))
        for asset in expected:
            remote = next((a for a in release['assets'] if a['name'] == asset['file']), None)
            if not remote:
                path = folder / asset['file']
                if asset['file'].endswith('.exe'):
                    original = next(a for a in row['artifacts'] if a['file'] == asset['file'])
                    shutil.copy2(ROOT / original['localPath'], path)
                gh('release', 'upload', tag, str(path), '--repo', REPO)
                release = json.loads(gh('api', 'repos/' + REPO + '/releases/tags/' + tag))
                remote = next(a for a in release['assets'] if a['name'] == asset['file'])
            if remote['size'] != asset['bytes'] or remote.get('digest', '').upper() != 'SHA256:' + asset['sha256']:
                raise ValueError('Existing remote artifact differs; do not overwrite: ' + tag + '/' + asset['file'])
        proof = {'version': version, 'tag': tag, 'commit': row['sourceCommit'],
                 'release': release['html_url'], 'immutableAssetsVerified': True, 'assets': expected}
        write(folder / 'published.json', proof)
        print('Verified independent Release ' + tag, flush=True)
        # Remove only redundant staging copies after remote verification. The
        # originals remain in the separate immutable delivery directories.
        for p in folder.glob('*.exe'):
            if not p.resolve().is_relative_to(LOCAL.resolve()):
                raise ValueError('Staging cleanup path escaped')
            p.unlink()
    write(LOCAL / 'complete.json', {'repository': REPO, 'versionsVerified': len(tags), 'tags': tags, 'pass': True})
    finalize()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['inventory', 'restore-tags', 'publish', 'finalize'])
    args = parser.parse_args()
    {'inventory': inventory, 'restore-tags': restore_tags, 'publish': publish, 'finalize': finalize}[args.operation]()
