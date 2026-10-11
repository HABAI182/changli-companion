"""Publish the current saved engineering build to the authorized private repo.

Uses gh's credential store without exposing tokens. No force push, visibility
changes or replacement of existing binaries. Requires a clean committed source.
"""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GH = ROOT / 'tools/github-upload/bin/gh/bin/gh.exe'
OWNER = 'HABAI182'
REPO = OWNER + '/changli-companion'
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
TAG = 'v' + VERSION
DELIVERY = ROOT / ('deliveries/20261011-desktop-' + VERSION)

def command(args, check=True):
    return subprocess.run(args, cwd=ROOT, text=True, encoding='utf-8',
                          capture_output=True, check=check)

def gh(*args):
    return command([str(GH), *args]).stdout.strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def main():
    if gh('api', 'user', '--jq', '.login').casefold() != OWNER.casefold():
        raise ValueError('Unexpected GitHub account')
    if command(['git', 'status', '--porcelain']).stdout.strip():
        raise ValueError('Save and commit intended changes before publishing')
    meta = json.loads(gh('repo', 'view', REPO, '--json', 'url,isPrivate,owner'))
    if not meta['isPrivate'] or meta['owner']['login'].casefold() != OWNER.casefold():
        raise ValueError('Destination must remain the owned private repository')
    if command(['git', 'remote', 'get-url', 'origin']).stdout.strip() != 'https://github.com/' + REPO + '.git':
        raise ValueError('Unexpected origin')
    artifacts = json.loads((DELIVERY / 'SHA256.json').read_text(encoding='utf-8-sig'))
    for item in artifacts:
        path = DELIVERY / item['file']
        if path.stat().st_size != item['bytes'] or sha(path) != item['sha256']:
            raise ValueError('Release artifact differs: ' + item['file'])
    gh('auth', 'setup-git', '--hostname', 'github.com')
    print(command(['git', 'push', '-u', 'origin', 'main']).stderr.strip())
    head = command(['git', 'rev-parse', 'HEAD']).stdout.strip()
    if gh('api', 'repos/' + REPO + '/commits/main', '--jq', '.sha') != head:
        raise ValueError('Remote source differs')
    existing = command([str(GH), 'api', 'repos/' + REPO + '/releases/tags/' + TAG], check=False)
    if existing.returncode:
        print(gh('release', 'create', TAG,
                 *[str(DELIVERY / item['file']) for item in artifacts],
                 str(DELIVERY / 'SHA256.json'), '--repo', REPO, '--target', head,
                 '--title', '离火长明 ' + VERSION + ' 工程版', '--prerelease',
                 '--notes-file', str(ROOT / 'tools/github-upload/release-notes-' + VERSION + '.md')))
    release = json.loads(gh('api', 'repos/' + REPO + '/releases/tags/' + TAG))
    assets = {item['name']: item for item in release['assets']}
    checks = artifacts + [{'file': 'SHA256.json', 'bytes': (DELIVERY / 'SHA256.json').stat().st_size,
                          'sha256': sha(DELIVERY / 'SHA256.json')}]
    for item in checks:
        asset = assets.get(item['file'])
        if not asset:
            gh('release', 'upload', TAG, str(DELIVERY / item['file']), '--repo', REPO)
            release = json.loads(gh('api', 'repos/' + REPO + '/releases/tags/' + TAG))
            asset = next(a for a in release['assets'] if a['name'] == item['file'])
        if asset['size'] != item['bytes'] or asset.get('digest', '').upper() != 'SHA256:' + item['sha256']:
            raise ValueError('Remote checksum mismatch: ' + item['file'])
    result = {'uploaded': True, 'private': True, 'repository': meta['url'],
              'commit': head, 'release': release['html_url'],
              'prerelease': release['prerelease'], 'assets': checks}
    local = ROOT / 'tools/github-upload/local'
    local.mkdir(exist_ok=True)
    (local / ('upload-result-' + VERSION + '.json')).write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        print('GitHub operation failed:', error.stderr.strip() or error.stdout.strip())
        raise SystemExit(error.returncode)
