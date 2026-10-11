"""Save honest release scope and native evidence before the next art iteration."""
import hashlib,json
from pathlib import Path
from datetime import datetime
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
core=load(HERE/'build/reference-repair-v68-core-verification-20261006.json')
assert core['pass'] and core['version']==68
assert load(HERE/'build/native-export-pipeline-v68-20261006.json')['pass']
folder=HERE/'build/desktop-0.6.7-ui-20261006'
observation=(folder/'native-settings-observation.txt').read_text(encoding='utf-8')
assert 'Live2D 已加载' in observation and 'Value: 93 ID: pet-size' in observation
scaled=load(folder/'native-scaled-settings.json');size=load(folder/'native-size-125.json')
assert scaled['scale']==1.25 and size=={'width':450,'height':400}
artifacts=load(ROOT/'deliveries/20261009-desktop-0.6.7/SHA256.json')
for row in artifacts:assert sha(ROOT/'deliveries/20261009-desktop-0.6.7'/row['file'])==row['sha256']
doc={'savedAt':datetime.now().astimezone().isoformat(),'appVersion':'0.6.7','candidate':68,'buildExitCode':0,
 'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,'nativeSettingsLoaded':True,
 'native125PercentResizeVerified':True,'nativeSize':size,'initialObservedScale':.93,
 'restoreInitialScalePending':True,'nativeScaleAndRestartThisBuildVerified':False,
 'nativeInputHandsThisBuildVisualVerified':False,'actualSdkInputGeometryVerifiedSeparately':True,
 'blinkVisualAcceptance':False,'nearClosedFaintContourRemaining':True,
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,'completeWindowsAcceptance':False,'formalArtComplete':False,
 'toolControlBlockedOnContinuation':['Computer Use was not approved to use changli-companion','Computer Use was not approved to use java'],
 'sourceSha256':{file:sha(ROOT/file) for file in ['src/App.tsx','src/style.css','src/settings/SettingsPanel.tsx','src/settings/settings.css','src/settings/scalePreview.ts','src-tauri/src/main.rs','public/models/changli/model.json']},
 'artifacts':artifacts,'proofImages':[{'file':p.name,'sha256':sha(p)} for p in folder.glob('*.png')]}
write(folder/'windows-verification-status.json',doc)
status=load(HERE/'build/input-blink-20261008/release-status.json')
status.update(savedAt=doc['savedAt'],candidateAppVersion='0.6.7',publishedAppVersion='0.6.7',nativeVersion=68,newExeGenerated=True,newWindowsRunVerified=True,
 nativeScaleAndRestartVerified=False,native125PercentResizeVerified=True,blinkVisualAcceptance=False,blinkRemaining='Near-closed faint original contour; complete animation art acceptance pending.',
 next='Restore original93% scale via native UI when tool control is available, then align near-closed eye contours in a new native source; preserve v68 verified recovery.',
 blockers=doc['toolControlBlockedOnContinuation'])
write(HERE/'build/input-blink-20261008/release-status.json',status)
section=f'''# 2026-10-09 当前进度：桌宠0.6.7 / 原生 Live2D v68

目标仍为正式长离 Live2D Windows 桌宠，不增加专注/待办功能。当前项目未找到Git仓库和适用AGENTS.md，以原生源备份、代码恢复包和交接记录续接。

已实现：在可编辑Cubism原生工程中修正右眼轮廓闭眼变形继承，重新调整闭合变形器以消除翻折、平衡半闭左右眼，收窄原眼轮廓/眼白与闭眼睫毛的透明度窗口，补齐最小端点。v66、v67因原生透明度自动插值及缺少最小关键帧而检查失败，保留失败记录，未用于EXE。没有修改MOC3二进制冒充原生制作。

已验证：v68官方导出与运行资源逐字节匹配；43网格、36参数、529组姿态回归、1200帧物理通过。全部43原始网格关键形坐标保持，六个透明度曲线按预期改变；2002次采样眼白与轮廓透明度差为0，重叠指标最大0.01234568。原生尾羽alpha与键盤姿态复核通过。实际Adapter/Backend/Core单手输入和眨眼检查、浏览器SDK运行链、设置页和快捷菜单回归均退出0。

已生成并实际运行Windows0.6.7 EXE，原生透明桌宠可见，设置页显示Live2D已加载。设置卡片界面和50%—200%、1%步进连续大小保留，实机125%窗口450×400并保存SQLite1.25。启动时用户大小93%，验证后恢复93%尚未完成：续接时工具分别拒绝桌宠和Java窗口操作。不要把旧0.6.6的退出重开验证当成新版已验证。新EXE/安装包见deliveries/20261009-desktop-0.6.7，SHA256.json已核对。

未完工：实际SDK12帧画面已核对，明显双重眼眶减轻、半闭右眼及完全闭合改善，但快闭合约0.1参数仍有淡原图轮廓，眨眼美术不算完工。下一步先原生UI恢复93%，再在v69隔离工程对齐近闭合轮廓；头颈/袖口大角度接缝、饰品和凤凰精细变形仍待精修，呆毛暂缓。安装卸载、多显示器/DPI完整验收未完成。不关机。

最近已验证源：tools/live2d-authoring/build/ChangliReferenceRepair-v68-20261006.cmo3，SHA256 143F1F88604C683EA82D581FECA35ABB34CDF40C9D50A7EB1A2E0DCA9F4F6835。源工程已保存，正式美术未全部验收。原生模型检查、浏览器检查和Windows检查分别记录。

以下为历史记录，以本条为准。

'''
for name in ['ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261009.md','README.md','TEST-REPORT.md']:
    p=ROOT/name;p.write_text(section+(p.read_text(encoding='utf-8-sig') if p.exists() else ''),encoding='utf-8')
(ROOT/'DELIVERY-0.6.7.md').write_text(section,encoding='utf-8')
print('Saved current v68 source, EXE and scoped native/browser checks with remaining art and125% restore pending.')
