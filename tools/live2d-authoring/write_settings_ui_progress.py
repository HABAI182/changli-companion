"""Record UI/continuous-size delivery only after actual Windows evidence exists."""
import hashlib,json
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
app=load(ROOT/'package.json')['version']
if app!='0.6.6':raise ValueError('Wrong release version')
browser=load(HERE/'build/settings-ui-20261009/verification.json')
core=load(HERE/'build/input-blink-20261008/core-verification.json')
sdk=load(HERE/'build/input-blink-20261008/verification.json')
native=load(HERE/'build/desktop-0.6.6-ui-20261006/windows-verification-status.json')
for doc in (browser,core,sdk):
    if doc.get('appVersion')!=app or not doc['pass']:raise ValueError('Current verification missing')
    for file,digest in doc['sourceSha256'].items():
        if sha(ROOT/file)!=digest:raise ValueError('Verified source changed: '+file)
if not native['nativeSettingsLoaded'] or not native['continuousScaleAndRestartVerified']:raise ValueError('Windows scale/UI evidence incomplete')
delivery=ROOT/'deliveries/20261009-desktop-0.6.6'
for row in load(delivery/'SHA256.json'):
    if sha(delivery/row['file'])!=row['sha256']:raise ValueError('Delivery hash mismatch')
status={'savedAt':datetime.now().astimezone().isoformat(),'candidateAppVersion':app,'publishedAppVersion':app,
 'nativeVersion':60,'unitTestFiles':14,'unitTestsPassed':71,'unitTestExitCode':0,
 'typecheckExitCode':0,'frontendBuildExitCode':0,'inputBlinkCorePass':True,'inputBlinkBrowserSdkPass':True,
 'nativeBuildExitCode':0,'newExeGenerated':True,'newWindowsRunVerified':True,
 'continuousScalePercent':[50,200],'scaleStepPercent':1,'nativeScaleAndRestartVerified':True,
 'blinkVisualAcceptance':False,'blinkRemaining':'Halfway eyelid contours need native keyform refinement.',
 'ahogeDeferred':True,'formalArtComplete':False,'blockers':[],
 'historicalBuildFailuresResolvedBy':'Current full-access execution profile; normal Tauri build succeeded without changing OS permissions.',
 'next':'Inspect externally saved v60 source against verified export source before blink keyform edits; preserve released UI/input, then refine remaining art.'}
(HERE/'build/input-blink-20261008/release-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
blockers={'savedAt':status['savedAt'],'goal':'正式长离 Live2D Windows 桌宠','currentAppVersion':app,
 'publishedAppVersion':app,'computerUse':{'available':True},'localRuntimeQa':{'executedThisTurn':True,'previousEaccesResolved':True},
 'sourceExport':{'matches':False,'runtimeExportMatchesVerifiedSource':True,'currentVersion':60,'unexportedWorkingSource':True},'windowsDesktopVerifiedThisVersion':True,
 'windowsBuildBlocked':False,'blockers':[],'remainingArt':[status['blinkRemaining'],'neck/cuff contours','independent ornaments and Phoenix','ahoge deferred'],
 'shutdownPerformed':False,'formalArtComplete':False}
(HERE/'build/CURRENT-OPERATIONAL-BLOCKERS-20261008.json').write_text(json.dumps(blockers,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
section=f'''# 当前进度：2026-10-09，桌宠0.6.6 / 原生 Live2D v60

本轮按用户要求重做设置页：接近iOS/Windows11的浅灰背景、白色圆角卡片、珊瑚色滑杆与开关；常用项分为显示与动作、键鼠互动、桌面陪伴，高级启动/恢复快捷键/渲染/动作槽/音效/诊断默认折叠。原生设置窗口480×760，最小360×500。保留用户数据，不添加专注或待办入口。

桌宠大小从6个固定档改为50%—200%、1%步进的连续滑杆。拖动调用独立原生preview_scale即时缩放窗口；合并滞后的中间预览请求，松开、键盘调节结束或失焦才保存大小设置，不反复注册快捷键或修改开机启动。设置写入串行且读取最新持久设置，避免旧页面状态覆盖其他选择。恢复默认大小按钮可回到100%。

验证：14文件71项测试通过；类型检查、前端构建和Windows NSIS打包退出0。实际浏览器137%拖动、保存前实时预览、松开保存、刷新恢复、其他设置保留、默认恢复与360/390/480/620宽度无横向溢出通过；原有菜单、表情、凤凰按钮和高级选项回归通过。原生Windows新EXE已运行，设置页与Live2D加载可见，连续缩放和退出重开恢复经过实机验证；截图和详情见tools/live2d-authoring/build/desktop-0.6.6-ui-20261006/windows-verification-status.json。

此前0.6.5的访问拒绝来自当时受限执行模式；改为完全访问后常规构建成功。没有调整Windows安全或应用权限。0.6.5已成功生成，当前交付升级为0.6.6，位置deliveries/20261009-desktop-0.6.6；该目录SHA256.json校验通过。

沿用单手输入修正：键鼠模式所有键盘输入只用右手、鼠标只用左手，取消快打双手动作，清除中断压力；正式MOC3、实际Adapter/Backend的Core与浏览器WebGL逐帧检查再次通过。眨眼80ms闭合、35ms闭合停留、145ms重开，完整闭合/恢复正常；人工核对发现半闭眼轮廓仍不自然，尚未完成原生眼睑关键形精修，不能把时序通过说成正式美术完工。呆毛按用户要求暂缓。

本轮没有编辑原生模型。官方v60 MOC3与纹理哈希保持不变，保留之前通过的尾羽补全、朝向键盘和耳饰遮挡。发现当前CMO3于10月8日23:19另存过，SHA256已变为3CC74D488CFD5BD89BB1570FA8749D862DD9BBB4965D96777900B3C8AEB20811，与已验证导出源1BD69B13C71A139A3E5DF92865D8DBA44A32B9A52EDD9DD9E26DF2B8B6EB78E8不同；额外保存当前工作源并保留旧验证源，未覆盖或擅自发布新原生内容。需先核对源差异再继续眼睑关键形。未完成：半闭眼关键形、大角度头颈/袖口衔接、独立饰品与凤凰精细形变、安装卸载与多DPI完整验收。新窗口缩放检查不代表所有显示器环境均通过。不关机。

下一步核对另存原生源的差异，再修眨眼中间帧和剩余美术；不重做已通过的设置页、连续大小、单手输入与尾羽修正。

以下为历史记录，以本条为准。

'''
for name in ('ENGINEERING_HANDOFF.md','README.md','TEST-REPORT.md','PROGRESS-CHECKPOINT-20261009.md'):
    p=ROOT/name;old=p.read_text(encoding='utf-8-sig') if p.exists() else ''
    if old.startswith('# 当前进度：2026-10-09，桌宠0.6.6'):
        old=old.split('以下为历史记录，以本条为准。\n\n',1)[1]
    p.write_text(section+old,encoding='utf-8')
(ROOT/'DELIVERY-0.6.6.md').write_text('''# 0.6.6 设置页与连续大小更新

设置页改为浅灰白卡片和珊瑚色开关，常用项分组、高级选项折叠。桌宠大小可在50%—200%以1%步进连续调节，拖动实时预览，结束后自动保存，支持恢复默认。

程序：deliveries/20261009-desktop-0.6.6/changli-companion.exe；安装包与SHA256在同目录。71项测试、浏览器交互/窄屏布局、实际Windows模型加载、连续缩放及重开恢复通过。构建退出0。

沿用单手键鼠输入修正和更缓和的眨眼时序。半闭眼轮廓仍需原生关键形精修，呆毛暂缓；正式模型仍在制作。安装卸载、多DPI和全部美术尚未验收。
''',encoding='utf-8')
(ROOT/'DELIVERY-0.6.5.md').write_text('''# 0.6.5 输入与眨眼时序更新（已有后续0.6.6）

完全访问模式下常规Windows打包成功；程序与安装包保存在deliveries/20261008-desktop-0.6.5。实际窗口已运行。之前的访问拒绝日志作为历史记录保留，当前不再阻塞。

0.6.6包含全部单手输入、按压归零与80/35/145ms眨眼时序修正，并新增设置页和连续大小，优先使用0.6.6。半闭眼轮廓尚需精修，不能宣称眨眼美术已全部完成。
''',encoding='utf-8')
print('Recorded desktop0.6.6 UI/scale release, verified Windows proof, and truthful remaining art work.')
