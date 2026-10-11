"""Upload the prepared project and verified 0.7.3 artifacts after local gh login.

Uses GitHub CLI's credential store; never reads or prints access tokens.
Refuses an unexpected account, public destination, dirty source or mismatched
release artifact. It never force-pushes or overwrites an existing release.
"""
import subprocess,json,hashlib,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
GH=ROOT/'tools/github-upload/bin/gh/bin/gh.exe'
OWNER='HABAI182';REPO=OWNER+'/changli-companion'
def command(args,check=True):
 return subprocess.run(args,cwd=ROOT,text=True,encoding='utf-8',capture_output=True,check=check)
def gh(*args):return command([str(GH),*args]).stdout.strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
try:
 actor=gh('api','user','--jq','.login')
 if actor.casefold()!=OWNER.casefold():raise ValueError('Logged in to unexpected account: '+actor)
 if command(['git','status','--porcelain']).stdout.strip():raise ValueError('Commit all intended source changes before upload')
 delivery=ROOT/'deliveries/20261011-desktop-0.7.3'
 artifacts=json.loads((delivery/'SHA256.json').read_text(encoding='utf-8-sig'))
 if not all(sha(delivery/a['file'])==a['sha256'] for a in artifacts):raise ValueError('Artifact hash changed')
 # GitHub normalizes non-ASCII asset names. Use stable download filenames and
 # a matching release-only checksum manifest; preserve the local delivery.
 upload=ROOT/'tools/github-upload/local/release-assets';upload.mkdir(parents=True,exist_ok=True)
 remote_artifacts=[]
 for a in artifacts:
  name=a['file'] if a['file'].isascii() else 'changli-companion-0.7.3-x64-setup.exe'
  shutil.copy2(delivery/a['file'],upload/name)
  remote_artifacts.append({**a,'file':name})
 (upload/'SHA256.json').write_text(json.dumps(remote_artifacts,indent=2)+'\n',encoding='utf-8')
 existing=command([str(GH),'repo','view',REPO,'--json','url,isPrivate,owner'],check=False)
 if existing.returncode:
  print(gh('repo','create',REPO,'--private','--source=.','--remote=origin','--description','离火长明 · Q版长离 Live2D Windows 桌面伴侣'))
 meta=json.loads(gh('repo','view',REPO,'--json','url,isPrivate,owner'))
 if not meta['isPrivate'] or meta['owner']['login'].casefold()!=OWNER.casefold():raise ValueError('Destination must be owned private repository')
 origin=command(['git','remote','get-url','origin'],check=False)
 expected='https://github.com/'+REPO+'.git'
 if origin.returncode:command(['git','remote','add','origin',expected])
 elif origin.stdout.strip()!=expected:raise ValueError('Unexpected origin; do not overwrite it')
 gh('auth','setup-git','--hostname','github.com')
 pushed=command(['git','push','-u','origin','main']);print(pushed.stderr.strip())
 head=command(['git','rev-parse','HEAD']).stdout.strip()
 remote=gh('api','repos/'+REPO+'/commits/main','--jq','.sha')
 if remote!=head:raise ValueError('Remote commit differs from local source')
 release=command([str(GH),'api','repos/'+REPO+'/releases/tags/v0.7.3'],check=False)
 if release.returncode:
  print(gh('release','create','v0.7.3',*[str(upload/a['file']) for a in remote_artifacts],str(upload/'SHA256.json'),
   '--repo',REPO,'--target','main','--title','离火长明 0.7.3 工程版','--prerelease',
   '--notes-file',str(ROOT/'tools/github-upload/release-notes.md')))
 published=json.loads(gh('api','repos/'+REPO+'/releases/tags/v0.7.3'))
 assets={a['name']:a for a in published['assets']}
 for a in remote_artifacts:
  got=assets.get(a['file'])
  if not got:
   same=next((v for v in assets.values() if v.get('digest','').upper()=='SHA256:'+a['sha256'] and v['size']==a['bytes']),None)
   if same:
    got=json.loads(gh('api','--method','PATCH','repos/'+REPO+'/releases/assets/'+str(same['id']),'-f','name='+a['file']))
   else:
    gh('release','upload','v0.7.3',str(upload/a['file']),'--repo',REPO)
    refreshed=json.loads(gh('api','repos/'+REPO+'/releases/tags/v0.7.3'))
    got=next((v for v in refreshed['assets'] if v['name']==a['file']),None)
  if not got or got['size']!=a['bytes']:raise ValueError('Remote asset missing or wrong size: '+a['file'])
  if got.get('digest') and got['digest'].upper()!='SHA256:'+a['sha256']:raise ValueError('Remote digest mismatch: '+a['file'])
 gh('release','upload','v0.7.3',str(upload/'SHA256.json'),'--repo',REPO,'--clobber')
 published=json.loads(gh('api','repos/'+REPO+'/releases/tags/v0.7.3'))
 checksums=next((a for a in published['assets'] if a['name']=='SHA256.json'),None)
 if not checksums or checksums.get('digest','').upper()!='SHA256:'+sha(upload/'SHA256.json'):raise ValueError('Release checksum manifest mismatch')
 report={'uploaded':True,'private':True,'repository':meta['url'],'commit':head,'release':published['html_url'],
  'prerelease':published['prerelease'],'assets':[{'name':a['name'],'size':a['size'],'digest':a.get('digest')} for a in published['assets']]}
 out=ROOT/'tools/github-upload/local/upload-result.json';out.parent.mkdir(exist_ok=True)
 out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False,indent=2))
except subprocess.CalledProcessError as e:
 print('GitHub command failed:',e.stderr.strip() or e.stdout.strip());raise SystemExit(e.returncode)
