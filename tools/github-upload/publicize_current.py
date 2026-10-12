"""User-authorized public beta visibility change and anonymous verification.

Run only after the immutable release upload and local security checks complete.
Credentials remain in gh's credential store; anonymous checks send no auth.
"""
import hashlib,json,subprocess,urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
GH=ROOT/'tools/github-upload/bin/gh/bin/gh.exe'
REPO='HABAI182/changli-companion';LOCAL=ROOT/'tools/github-upload/local'
VERSION=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']

def gh(*args,required=True):
    r=subprocess.run([str(GH),*args],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
    if required and r.returncode:raise RuntimeError(r.stderr.strip())
    return r
def anonymous(url,method='GET'):
    req=urllib.request.Request(url,method=method,headers={'Accept':'application/vnd.github+json','User-Agent':'changli-public-beta-verification'})
    with urllib.request.urlopen(req,timeout=45) as r:
        return {'status':r.status,'contentLength':r.headers.get('Content-Length'),'body':r.read() if method=='GET' else b''}
def main():
    upload=json.loads((LOCAL/('upload-result-'+VERSION+'.json')).read_text(encoding='utf-8'))
    if not upload['uploaded'] or upload['repository']!='https://github.com/'+REPO:raise ValueError('Verify release first')
    if json.loads((LOCAL/'gitleaks-history-accepted-20261012.json').read_text(encoding='utf-8')):raise ValueError('Review secret findings before public visibility')
    if json.loads((LOCAL/'npm-audit-fixed-20261012.json').read_text(encoding='utf-8-sig'))['metadata']['vulnerabilities']['total']:raise ValueError('Review npm findings')
    if gh('api','user','--jq','.login').stdout.strip()!='HABAI182':raise ValueError('Unexpected account')
    meta=json.loads(gh('repo','view',REPO,'--json','isPrivate,owner').stdout)
    if meta['owner']['login']!='HABAI182':raise ValueError('Unexpected owner')
    release=json.loads(gh('api','repos/'+REPO+'/releases/tags/v'+VERSION).stdout)
    if release['draft']:raise ValueError('Release upload is unfinished')
    if meta['isPrivate']:
        gh('repo','edit',REPO,'--visibility','public','--accept-visibility-change-consequences')
    # Free public-repository security features only, no paid service enrollment.
    config=LOCAL/'security-enable.json'
    config.write_text(json.dumps({'security_and_analysis':{'secret_scanning':{'status':'enabled'},'secret_scanning_push_protection':{'status':'enabled'}}}),encoding='utf-8')
    operations={}
    for name,args in [('secretScanning',('api','--method','PATCH','repos/'+REPO,'--input',str(config))),('dependencyAlerts',('api','--method','PUT','repos/'+REPO+'/vulnerability-alerts')),('privateVulnerabilityReporting',('api','--method','PUT','repos/'+REPO+'/private-vulnerability-reporting'))]:
        r=gh(*args,required=False);operations[name]={'success':r.returncode==0,'error':r.stderr.strip() if r.returncode else None}
    publicMeta=json.loads(anonymous('https://api.github.com/repos/'+REPO)['body'])
    if publicMeta['private'] or publicMeta['visibility']!='public':raise ValueError('Anonymous repository is not public')
    readme=anonymous('https://raw.githubusercontent.com/'+REPO+'/main/README.md')
    if VERSION.encode() not in readme['body']:raise ValueError('Anonymous source is stale')
    published=json.loads(anonymous('https://api.github.com/repos/'+REPO+'/releases/tags/v'+VERSION)['body'])
    if published['draft']:raise ValueError('Anonymous release remains draft')
    assets={x['name']:x for x in published['assets']}
    def check(item):
        a=assets[item['file']]
        if a['size']!=item['bytes'] or a.get('digest','').upper()!='SHA256:'+item['sha256']:raise ValueError('Public artifact metadata differs')
        head=anonymous(a['browser_download_url'],'HEAD')
        if head['status']!=200:raise ValueError('Anonymous download unavailable')
        if head['contentLength'] and int(head['contentLength'])!=item['bytes']:raise ValueError('Anonymous file size differs')
        return {'file':item['file'],'status':head['status'],'bytes':item['bytes'],'sha256':item['sha256']}
    with ThreadPoolExecutor(max_workers=3) as pool:downloads=list(pool.map(check,upload['assets']))
    security=json.loads(gh('api','repos/'+REPO,'--jq','.security_and_analysis').stdout)
    vulnerability=gh('api','repos/'+REPO+'/private-vulnerability-reporting',required=False)
    report={'public':True,'anonymousRepositoryVerified':True,'anonymousSourceVerified':True,'anonymousReleaseVerified':True,'anonymousDownloads':downloads,'version':VERSION,'repository':'https://github.com/'+REPO,'release':published['html_url'],'sourceCommit':upload['commit'],'securityOperations':operations,'securityState':security,'privateVulnerabilityReporting':json.loads(vulnerability.stdout) if vulnerability.returncode==0 else None}
    (LOCAL/('public-result-'+VERSION+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
