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
DELIVERIES = sorted((ROOT / 'deliveries').glob('*-desktop-' + VERSION))
if len(DELIVERIES) != 1:
    raise ValueError('Each version requires exactly one independent delivery directory')
DELIVERY = DELIVERIES[0]

def command(args, check=True):
    return subprocess.run(args, cwd=ROOT, text=True, encoding='utf-8',
                          capture_output=True, check=check)

def gh(*args):
    return command([str(GH), *args]).stdout.strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def release_for_tag():
    # Drafts do not have a public tag URL yet. Inspect owned releases by tag,
    # so an interrupted upload resumes without making a second draft.
    rows = json.loads(gh('api', 'repos/' + REPO + '/releases?per_page=100'))
    matches = [r for r in rows if r['tag_name'] == TAG]
    if len(matches) > 1:
        raise ValueError('Ambiguous release drafts')
    return matches[0] if matches else None

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
    release = release_for_tag()
    if not release:
        print(gh('release', 'create', TAG,
                 '--draft', '--repo', REPO, '--target', head,
                 '--title', '离火长明 ' + VERSION + ' 工程版', '--prerelease',
                 '--notes-file', str(ROOT / ('tools/github-upload/release-notes-' + VERSION + '.md'))))
        release = release_for_tag()
    if release['draft']:
        target = command(['git', 'rev-parse', release['target_commitish']]).stdout.strip()
        target_package = json.loads(command(['git', 'show', target + ':package.json']).stdout)
        if target_package['version'] != VERSION or command(['git', 'diff', target, head, '--',
                'src', 'src-tauri', 'public', 'package.json', 'package-lock.json', 'index.html']).stdout.strip():
            raise ValueError('Draft source does not match the saved application')
    assets = {item['name']: item for item in release['assets']}
    checks = artifacts + [{'file': 'SHA256.json', 'bytes': (DELIVERY / 'SHA256.json').stat().st_size,
                          'sha256': sha(DELIVERY / 'SHA256.json')}]
    for item in checks:
        asset = assets.get(item['file'])
        if not asset:
            print('Uploading missing asset:', item['file'], flush=True)
            gh('release', 'upload', TAG, str(DELIVERY / item['file']), '--repo', REPO)
            release = release_for_tag()
            asset = next(a for a in release['assets'] if a['name'] == item['file'])
        if asset['size'] != item['bytes'] or asset.get('digest', '').upper() != 'SHA256:' + item['sha256']:
            raise ValueError('Remote checksum mismatch: ' + item['file'])
    if release['draft']:
        gh('release', 'edit', TAG, '--repo', REPO, '--draft=false')
        release = release_for_tag()
    source_commit = gh('api', 'repos/' + REPO + '/commits/' + TAG, '--jq', '.sha')
    result = {'uploaded': True, 'private': True, 'repository': meta['url'],
              'commit': source_commit, 'release': release['html_url'],
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
