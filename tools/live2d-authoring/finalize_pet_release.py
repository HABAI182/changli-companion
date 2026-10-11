"""Preserve a built desktop candidate and accurately scoped native observations."""
import hashlib
import json
from pathlib import Path
import shutil
from datetime import datetime

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()

if __name__=='__main__':
    version=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
    if version not in ('0.5.9','0.5.10','0.5.11','0.5.12','0.5.13','0.5.14'): raise ValueError('This snapshot only describes observed candidates')
    model_version={'0.5.9':35,'0.5.10':37,'0.5.11':39,'0.5.12':41,'0.5.13':42,'0.5.14':44}[version]
    folder=ROOT/f'deliveries/20261006-v{model_version}-pet-{version}-candidate'
    folder.mkdir(parents=True,exist_ok=True)
    sources=[ROOT/'src-tauri/target/release/changli-companion.exe',ROOT/f'src-tauri/target/release/bundle/nsis/离火长明_{version}_x64-setup.exe']
    for source in sources:
        target=folder/source.name
        if target.exists() and sha(target)!=sha(source): raise ValueError('Never overwrite a different release snapshot')
        if not target.exists(): shutil.copy2(source,target)
    for release in (folder,ROOT/'deliveries/20261006-v35-gaze-0.5.8-candidate'):
        rows=[{'file':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(release.glob('*.exe'))]
        (release/'SHA256.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    native={'savedAt':datetime.now().astimezone().isoformat(),'appVersion':version,'buildExitCode':0,
            'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,'nativeMenuPetOnlyVerified':True,
            'nativeSettingsWindowVerified':True,'nativeSettingsLive2DReadyObserved':True,
            'nativeIdleGesturesVisuallyVerified':False,'crossApplicationInputCountersVerified':False,
            'installerInstallUninstallVerified':False,'completeWindowsAcceptance':False,'formalArtComplete':False,
            'scope':'Actual Sky window observations: transparent character, menu with settings and no focus/todos, desktop settings title and Live2D ready status. Idle geometry validated in browser/Core, not measured in native window.'}
    source_files=['src/App.tsx','src/pet/presentation.ts','src/renderer/live2d/Live2DAdapter.ts','src-tauri/src/main.rs','public/models/changli/model.json']
    native['sourceSha256']={file:sha(ROOT/file) for file in source_files}
    native['artifacts']=json.loads((folder/'SHA256.json').read_text(encoding='utf-8'))
    status=HERE/f'build/desktop-{version}-ui-20261006/windows-verification-status.json'
    status.write_text(json.dumps(native,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (folder/'README.md').write_text(f'''# 长离 Live2D 桌宠 {version} 制作候选

运行 changli-companion.exe，或使用安装包。右键角色打开互动菜单；设置中可调大小、动效、置顶和鼠标穿透。

已实现：真实 v{model_version} Live2D 模型、键鼠反馈、视线平滑、三种空闲短动作、发束物理、凤凰技术动作。专注/待办入口与页面已移除，旧数据保留以避免破坏历史存档。

已验证：63 项前端测试、官方 Core 实际几何运行链、浏览器菜单；Windows 构建退出 0，实际启动后看到了透明角色、精简菜单和“Live2D 已加载”的桌宠设置页。

未完成：完整抠图轮廓、凤凰原图美术、独立饰品、多角度和完整表情动作。三种空闲动作已由 Core 验证，尚未完成原生窗口的定量测量。安装/卸载、物理手柄、多屏和全部桌面能力尚未重新验收。此包为制作候选，不能称为美术完工。

模型与源工程恢复点另见 PROGRESS-CHECKPOINT-20261006.md 和 tools/live2d-authoring/build/desktop-integration-20261006/FULL-RECOVERY.json。
''',encoding='utf-8')
    print(json.dumps({'delivery':str(folder),'native':native},ensure_ascii=True))
