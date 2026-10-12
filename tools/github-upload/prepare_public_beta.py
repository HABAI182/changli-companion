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
    progress=ROOT/'PROGRESS-CHECKPOINT-20261012.md'
    old=progress.read_text(encoding='utf-8') if progress.exists() else ''
    progress.write_text('# 0.7.10 公测制作中 — 2026-10-12\n\n输入编辑窗口过滤、独立邻接菜单、圆角图标与键盘精修源码已保存；typecheck、2项新前端测试和1项原生启动过滤测试通过。EXE尚未构建、仓库尚未公开、Windows冷启动尚未验收。新增许可说明与宣传视频prompt；源模型仍为v71，formalArtComplete=false。\n\n'+old,encoding='utf-8')
    assets=ROOT/'ASSETS.md';text=assets.read_text(encoding='utf-8')
    assets.write_text('# 素材来源与当前状态（2026-10-12 更新）\n\n用户本次明确声明：角色原图及衍生视觉素材由其生成，没有引用他人素材。记录为用户来源声明；不据此声称角色IP授权或官方背书。参考作者视频仅作为构图、反馈和节奏参考，未复制其模型/角色资源。\n\n当前应用0.7.10使用v71原生运行模型，表情和轮廓补绘含运行时资源；未宣称全部精细CMO3制作完毕。新圆角图标由内置imagegen编辑用户原图，见ICON-0.7.10.md；新键盘为可编辑SVG键帽结构。\n\n以下为早期制作记录，其中“来源未确认、未发布、尚未拆层”等描述只表示当时状态，不适用于当前发布状态。\n\n'+text,encoding='utf-8')
    notices=ROOT/'THIRD-PARTY-NOTICES.md';text=notices.read_text(encoding='utf-8')
    text=text.replace('用户原图作者/许可未确认，不自动认定为本项目原创。','用户于2026-10-12声明原图及衍生视觉素材均由其生成，未引用他人素材；这是用户来源声明，不代替角色IP授权。')
    text=text.replace('实际发行前须随构建产物整理所有传递依赖的完整许可证文本；本次交付为未发布的开发工程。','0.7.10随发行附件提供LICENSE-RUNTIME.txt和THIRD-PARTY-LICENSES.txt；后者收集本机依赖源包中的许可文件与元数据，并明确列出没有独立许可文件的包。Core许可和版权未被本项目MIT许可替换。当前为免费公测，后续重新分发仍须遵守SDK协议。')
    notices.write_text(text,encoding='utf-8')
    agents=ROOT/'AGENTS.md';text=agents.read_text(encoding='utf-8').replace('GitHub保持用户已授权的私有仓库','用户已于2026-10-12授权公开GitHub仓库')
    agents.write_text(text,encoding='utf-8')
    pub=ROOT/'tools/github-upload/publish_current.py';text=pub.read_text(encoding='utf-8').replace('authorized private repo','authorized owned repo').replace('not meta[\'isPrivate\'] or ','').replace('Destination must remain the owned private repository','Destination must remain the authorized owned repository').replace("'private': True","'private': meta['isPrivate']").replace("VERSION + ' 工程版'","VERSION + ' 公测版'")
    pub.write_text(text,encoding='utf-8')
    save=ROOT/'tools/live2d-authoring/save_current_release.py';text=save.read_text(encoding='utf-8').replace("('.json', '.png', '.exe')","('.json', '.png', '.exe', '.txt', '.md')");save.write_text(text,encoding='utf-8')
    readme=ROOT/'README.md';text=readme.read_text(encoding='utf-8').replace('当前工程版 **0.7.9','当前免费公测版 **0.7.10').replace('当前0.7.9便携','当前0.7.10便携').replace('releases/tag/v0.7.9','releases/tag/v0.7.10').replace('DELIVERY-0.7.9.md','DELIVERY-0.7.10.md').replace('打开私有版本下载页','打开GitHub版本下载页')
    text=text.replace('## 使用','## 公测说明\n\n新版采用圆角长离图标、精简设置标题与立体键帽；右键菜单独立显示在桌宠旁边。修正启动时桌宠窗口被误判为输入编辑窗口。按键浮现默认开启，保存过的偏好不会被强制修改。\n\n软件免费公测，未商业签名；下载安装前请核对Release附带的SHA256.json，另见[安全与隐私说明](SECURITY.md)、[许可说明](LICENSE-RUNTIME.txt)和[宣传视频制作prompt](PROMO-VIDEO-PROMPT.md)。新版本和历史版本分别留档。\n\n## 使用',1)
    readme.write_text(text,encoding='utf-8')
    print(json.dumps({'pathAudit':len(paths),'licensePackages':count,'licenseBytes':out.stat().st_size,'packagesWithoutStandaloneText':len(missing)}))

if __name__=='__main__':main()
