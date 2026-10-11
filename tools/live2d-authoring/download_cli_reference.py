"""Download the reviewed Live2D-only source at a fixed upstream commit."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

HERE = Path(__file__).resolve().parent
RESEARCH = HERE / 'references/tool-research-20261006'
TREE = json.loads((RESEARCH / 'cli-anything-tree.json').read_text(encoding='utf-8'))
PREFIX = 'live2d/agent-harness/'
DEST = RESEARCH / 'cli-anything-live2d-source'

def download(row):
    relative = row['path'][len(PREFIX):]
    target = DEST / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    raw = urllib.request.urlopen('https://raw.githubusercontent.com/HKUDS/CLI-Anything/' + TREE['sha'] + '/' + row['path'], timeout=40).read()
    target.write_bytes(raw)
    return {'path': relative, 'sha256': hashlib.sha256(raw).hexdigest().upper(), 'bytes': len(raw)}

if __name__ == '__main__':
    rows = [row for row in TREE['tree'] if row['type'] == 'blob' and row['path'].startswith(PREFIX)
            and '/tests/' not in row['path'] and row['path'].endswith(('.py', '.md', '.toml'))]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        resources = list(pool.map(download, rows))
    report = {'repository':'https://github.com/HKUDS/CLI-Anything', 'commit':TREE['sha'], 'resources':resources,
              'scope':'Runtime JSON/resource management. No native authoring or binary mesh edits.'}
    (RESEARCH / 'cli-download-manifest.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'commit':TREE['sha'],'files':len(resources),'destination':str(DEST)}))
