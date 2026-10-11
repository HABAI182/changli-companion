"""Save this stage with explicit code, Core, build and visual acceptance boundaries."""
import hashlib,json
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
now=datetime.now().astimezone().isoformat()
status={'savedAt':now,'candidateAppVersion':'0.6.5','publishedAppVersion':'0.6.4','nativeVersion':60,
 'unitTestFiles':13,'unitTestsPassed':69,'unitTestExitCode':0,'typecheckExitCode':0,'frontendBuildExitCode':0,
 'inputBlinkCorePass':True,'keyboardMouseKeyboardUsesRightOnly':True,'mouseUsesLeftOnly':True,
 'keyboardOnlyKeepsLeftRightZones':True,'rapidBothHandsRemoved':True,'interruptedHandResidueFixed':True,
 'blinkTimingMs':{'close':80,'closedHold':35,'open':145},'blinkVisualAcceptance':False,
 'nativeBuildExitCode':1,'newExeGenerated':False,'newWindowsRunVerified':False,
 'blockers':['Tauri relative dist canonicalization: Access denied (os error 5)',
             'Absolute-path build reached Cargo, then tauri-build Cargo.toml canonicalization failed: Access denied (os error 5)',
             'Local preview fetch EACCES and Edge headless launch pipe failure; browser/WebGL checks not executed'],
 'nativeSourceAndOfficialResourcesUnchanged':True,'ahogeDeferred':True,'formalArtComplete':False,
 'next':'Resolve execution filesystem access, build 0.6.5, then verify native keyboard/mouse and blink intermediate frames. Preserve v60 native art and prior release.'}
# The second canonicalization location follows tauri-build source and the last emitted log:
# Cargo.toml canonicalization is the next fallible operation after rustc-check-cfg=cfg(dev).
status['blockers'][1]='Absolute-path build reached Cargo, then tauri-build failed after cfg(dev): Access denied (os error 5); Cargo.toml canonicalization is the next fallible source operation (inference).'
report=HERE/'build/input-blink-20261008/core-verification.json'
core=json.loads(report.read_text(encoding='utf-8'))
if not core['pass'] or core['appVersion']!='0.6.5':raise ValueError('Core verification missing')
for file,digest in core['sourceSha256'].items():
    if hashlib.sha256((ROOT/file).read_bytes()).hexdigest().upper()!=digest:raise ValueError('Core-tested code changed')
(report.parent/'release-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
section=f'''# 当前进度：{now}，0.6.5 修正候选 / 原生 Live2D v60

用户本轮要求优先修“键盘双手一起按”和不自然的眨眼；呆毛暂缓。目标仍是 Live2D Windows 桌宠，不增加专注等额外功能。本项目没有 Git 仓库，未发现适用 AGENTS.md；采用文件恢复包，不能声称已提交 Git。

已修：键鼠模式下所有键盘输入仅用画面右手，鼠标仅用画面左手；纯键盘模式仍保留左右键区分工。取消快打自动变成双手动作，每帧重置双手压力基值，新的按压立即替换旧按压，避免 SDK 淡出或中断动作留下另一只手。浏览器备用分层渲染同步输入分工。

眨眼改成80毫秒平滑闭合、35毫秒完全闭合、145毫秒慢睁开，间隔4.0—6.6秒逐次随机；低动态仍完全闭眼，暂停恢复避免过期眨眼。没有改动原生眼睛网格或呆毛。仅完成时序修正，不宣称眼睑中间帧的美术或观感已全部验收。

验证：13个测试文件、69项测试通过，退出0；类型检查与前端生产构建通过，退出0。用正式v60 .moc3、官方 Core、工程实际 Presentation/Adapter/Backend 和 SDK 动作/表情管理器离线逐帧验证：8种按压组合通过；键鼠模式键盘右手最大位移11.47365原图像素，左手0；鼠标相反。18次连续输入、鼠标切到键盘与压力归零通过；两眼同步完整闭合及重开通过。此验证没有 WebGL 栅格渲染和原生窗口，也隔离了未改变的物理系统。报告：tools/live2d-authoring/build/input-blink-20261008/core-verification.json。

交付限制：0.6.5尚未生成新EXE/安装包。常规Tauri构建在dist路径规范化报“拒绝访问”(os error5)；绝对路径配置重试进入Cargo后，tauri-build再次报访问拒绝。没有修改权限或用旧EXE冒充新版。浏览器预览连接EACCES，离线Edge验证也在启动时报管道关闭，未完成眨眼画面验收。最新已发布可执行版仍是0.6.4，其旧实机证据仅适用于该版。

已使用 cli-anything-live2d 检查动作绑定，并新增直接运行官方Core的检查脚本，未通过低效Cubism点击重做原生素材；当前没有可调用的正式Cubism建模MCP。原生v60源工程、正式MOC3/纹理均经哈希核对未改。保留之前已通过的尾羽补全、键盘替换和耳饰遮挡修正。

下一步：先解决执行环境文件访问、生成0.6.5，再实机检查普通/快速/空格键单手动作与完整眨眼中间帧；眼睑中间帧美术若仍怪，再改原生关键形。随后按既有计划做接缝和独立饰品/凤凰；呆毛暂缓。不关机，不重做已完成阶段。

以下为历史进度；发布状态以本条为准。

'''
for name in ('ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261008.md','README.md','TEST-REPORT.md'):
    p=ROOT/name;old=p.read_text(encoding='utf-8-sig') if p.exists() else ''
    marker='# 当前进度：'
    # This stage writer runs once; a repeated invocation replaces only its own header.
    if old.startswith(marker) and '0.6.5 修正候选' in old.split('\n',1)[0]:
        old=old.split('以下为历史进度；发布状态以本条为准。\n\n',1)[1]
    p.write_text(section+old,encoding='utf-8')
delivery=ROOT/'DELIVERY-0.6.5.md'
delivery.write_text('''# 0.6.5 输入与眨眼修正候选（尚未发布）

键鼠模式修为键盘只用右手、鼠标只用左手，取消快速输入自动双手动作并清除中断残留；眨眼采用80/35/145毫秒的闭合、停留与睁开过渡。呆毛暂缓，正式v60模型资源不变。

69项测试、类型检查、前端构建及正式MOC3的实际SDK逐帧输入/眨眼参数检查通过。没有完成WebGL眨眼中间帧和Windows新版本实机验收。

Windows打包两次因文件访问拒绝失败，退出1；没有生成新的EXE或安装包。0.6.4仍是最后发布版本，不能用它验收本次代码修正。失败日志、Core检查及完整进度见tools/live2d-authoring/build/input-blink-20261008和PROGRESS-CHECKPOINT-20261008.md。

恢复环境后在工程根目录运行 npm run package:windows；验证新EXE后再记录SHA256与实机证据。正式美术仍未全部完成。
''',encoding='utf-8')
blockers={'savedAt':now,'goal':'正式长离 Live2D Windows 桌宠','currentAppVersion':'0.6.5','publishedAppVersion':'0.6.4',
 'computerUse':{'available':True},'localRuntimeQa':{'executedThisTurn':False,'coreOfflinePass':True,'previousEaccesResolved':False},
 'sourceExport':{'matches':True,'currentVersion':60},'windowsDesktopVerifiedThisVersion':False,
 'windowsBuildBlocked':True,'blockers':status['blockers'],'shutdownPerformed':False,'formalArtComplete':False}
(HERE/'build/CURRENT-OPERATIONAL-BLOCKERS-20261008.json').write_text(json.dumps(blockers,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Saved 0.6.5 code candidate / Core PASS / native build and visual verification pending.')
