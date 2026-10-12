"""Generate local audit summary and notices; never publish caches or credentials."""
import json, re, subprocess, tomllib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOCAL=ROOT/'tools/github-upload/local'

def main():
    # Git path inventory across every ref, including deleted historical paths.
    raw=subprocess.check_output(['git','log','--all','--format=','--name-only'],cwd=ROOT).decode('utf-8')
    paths=sorted(set(x.strip('"') for x in raw.splitlines() if x.strip()))
    forbidden=[p for p in paths if re.search(r'(^|/)(\.env(?:\..*)?|id_rsa|id_ed25519|credentials[^/]*|[^/]+\.(sqlite3?|db|pem|p12|pfx))$',p,re.I)]
    if forbidden: raise ValueError('Review forbidden historical paths: '+str(forbidden))
    (LOCAL/'public-path-audit.json').write_text(json.dumps({'historicalPaths':len(paths),'forbiddenPaths':forbidden,'scope':'path inventory, not a substitute for secret scanning'},indent=2),encoding='utf-8')
    chunks=['THIRD-PARTY LICENSE COLLECTION — 0.7.10\nOriginal upstream license files and package metadata.\nNot all development dependencies are shipped at runtime.\n']
    count=0; missing=[]
    def collect(label,folder,metadata):
        nonlocal count
        chunks.append('\n'+'='*72+'\n'+label+'\n'+metadata+'\n')
        found=[]
        for p in sorted(folder.glob('*')):
            if p.is_file() and re.match(r'^(license|licence|copying|notice)([.-]|$)',p.name,re.I):
                try: value=p.read_text(encoding='utf-8')
                except UnicodeError: continue
                found.append(p.name); chunks.append('\n--- '+p.name+' ---\n'+value)
        if not found: missing.append(label); chunks.append('No standalone license text in the installed package; see declared license and upstream source.\n')
        count+=1
    lock=json.loads((ROOT/'package-lock.json').read_text(encoding='utf-8'))
    for rel,item in lock['packages'].items():
        if not rel: continue
        folder=ROOT/rel
        if folder.exists(): collect(rel+'@'+item['version'],folder,'Declared license: '+str(item.get('license','See package metadata'))+'\nSource: https://registry.npmjs.org/'+rel.split('node_modules/')[-1])
    cargo=tomllib.loads((ROOT/'src-tauri/Cargo.lock').read_text(encoding='utf-8'))
    registry=Path.home()/'.cargo/registry/src'
    for p in cargo['package']:
        if not p.get('source','').startswith('registry+'): continue
        folders=list(registry.glob('*/'+p['name']+'-'+p['version']))
        if folders:
            cfg=tomllib.loads((folders[0]/'Cargo.toml').read_text(encoding='utf-8'))['package']
            collect(p['name']+'@'+p['version'],folders[0],'Declared license: '+str(cfg.get('license',cfg.get('license-file','See upstream')))+'\nSource: https://crates.io/crates/'+p['name']+'/'+p['version'])
        else: missing.append(p['name']+'@'+p['version']+' (source not installed)')
    for f in ['vendor/live2d/FRAMEWORK-LICENSE.md','vendor/live2d/CORE-LICENSE.md','vendor/live2d/CORE-REDISTRIBUTABLE-FILES.txt','tools/live2d-authoring/vendor/LICENSE']:
        chunks.append('\n'+'='*72+'\n'+f+'\n'+(ROOT/f).read_text(encoding='utf-8'))
    chunks.append('\nPackages without a standalone license file in local source:\n'+'\n'.join(missing)+'\nThese are not silently relicensed by the project MIT license.\n')
    out=LOCAL/'THIRD-PARTY-LICENSES.txt';out.write_text('\n'.join(chunks),encoding='utf-8')
    (LOCAL/'license-collection.json').write_text(json.dumps({'packagesCollected':count,'missingStandaloneLicenseFile':missing,'bytes':out.stat().st_size},indent=2),encoding='utf-8')
    print(json.dumps({'pathAudit':len(paths),'licensePackages':count,'licenseBytes':out.stat().st_size,'packagesWithoutStandaloneText':len(missing)}))

if __name__=='__main__':main()
