"""Publish current delivery notes from saved engineering/native observations."""
import json
import hashlib
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
now = datetime.now().astimezone().isoformat()
windows = json.loads((HERE / 'build/desktop-0.6.9-ui-20261006/windows-verification-status.json').read_text(encoding='utf-8'))
assert windows['appVersion'] == '0.6.9' and windows['nativeLaunchVerified']
working = HERE / 'ChangliReferenceRepair-v71-candidate.cmo3'
passed = HERE / 'build/ChangliReferenceRepair-v71-20261006.cmo3'
same_source = hashlib.sha256(working.read_bytes()).digest() == hashlib.sha256(passed.read_bytes()).digest()
source_note = ('当前工作源与已验证备份一致。' if same_source else
    '当前工作源于11:41再次另存，尚未重新验收，已另存独立恢复点；发布模型配对源仍为build/ChangliReferenceRepair-v71-20261006.cmo3。两份同时保留，不覆盖、不擅自发布另存变化。')
summary = f'''# 当前交付：0.6.9 / 长离原生Live2D v71

更新时间：{now}。目标仍为Windows长离Live2D桌宠，不增加专注、待办等额外入口。当前目录无Git仓库/适用AGENTS.md，通过原生备份和完整恢复包续接。

本次主要修复“不灵动”的工程根因：实际App之前每秒只传递一次动画快照，导致眨眼被跳过、视线和待机停顿。现在桌宠按30/60fps设置持续更新，设置窗口维持低频刷新。真实主页面12秒从12次提升到约360次更新，完整闭眼/恢复通过；Windows0.6.9已真实运行并观察自动眨眼，不能再沿用旧版冻结画面的验收结论。

保留并交付：透明置顶桌宠、可拖动、全局键鼠互动、键鼠模式左手鼠标/右手键盘、连续按键和动作中断复位、4个常用表情、凤凰互动、发束饰品物理与待机动作、系统托盘/穿透恢复、卡片式设置、50%—200%的1%步进连续大小。尾羽和朝向键盘沿用已验证资源，没有重复重画。

验证已足够支撑本次工程交付：14文件71测试通过，实际浏览器App/SDK/设置/菜单运行链通过，Windows EXE和NSIS构建退出0。实机确认透明角色及Live2D加载、开心/默认、外部单键/连续键/鼠标切键盘；137%实际窗口493×439、SQLite1.37、正常退出重开仍493×439。12:29恢复连接时大小已是100%，本轮保留当前100%和全部其他偏好，不强制恢复更早的94%。

交付文件：deliveries/20261011-desktop-0.6.9/changli-companion.exe，及同目录离火长明_0.6.9_x64-setup.exe；SHA256.json记录两者校验。新版已在Windows运行。可编辑源为tools/live2d-authoring/ChangliReferenceRepair-v71-candidate.cmo3。{source_note} 官方MOC3/运行资源逐字节匹配。不要修改MOC3二进制或把浏览器模拟当Windows能力。

按用户最新要求，工程优先，停止重复检查和微小美术追磨。尚未完成/未验收：近闭合极小参数区间、大角度头颈/袖口和饰品凤凰的全部精细美术，完整表情组；安装卸载、多显示器/DPI。常用及运行最大组合姿态已复查，不代表所有原生参数的最终美术通过。呆毛暂缓，formalArtComplete仍false。下一阶段只处理实际使用中的缺陷和明显美术问题，不重做已完成的设置、输入和尾羽，不无限增加测试。

进度保存：代码/原生源、官方资源、当前EXE和证据分别校验；完整恢复指针为tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。本条后马上生成包含0.6.9/v71的完整恢复包。没有Git提交，也不执行关机。

'''
(ROOT / 'DELIVERY-0.6.9.md').write_text(summary, encoding='utf-8')
for name in ('ENGINEERING_HANDOFF.md', 'PROGRESS-CHECKPOINT-20261011.md'):
    p = ROOT / name
    old = p.read_text(encoding='utf-8-sig').replace('2026-10-11 11:20 当前', '2026-10-11 11:10 阶段记录')
    p.write_text(summary + '以下为历史记录。\n\n' + old, encoding='utf-8')
readme = '''# 离火长明 · Q版长离Live2D桌宠

当前可用工程版：**0.6.9 / 原生Live2D v71**，Windows x64。

直接双击`deliveries/20261011-desktop-0.6.9/changli-companion.exe`即可运行，不需要启动开发服务器。同目录提供安装包和SHA256校验。打开后右键长离切换表情、召唤凤凰或进入设置；底部拖动按钮可调整位置。

已修复实际桌宠动画每秒才更新一次的问题，眨眼、视线与待机持续刷新。键鼠模式为左手鼠标、右手键盘；设置采用圆角卡片，大小50%—200%连续调节并自动保存。专注/待办入口已移除。当前用户大小100%保留。

这是真正加载Cubism模型的Windows透明桌宠。原生模型仍有精细美术与完整表情待完善；安装卸载、多显示器/DPI未全部验收。详见`DELIVERY-0.6.9.md`；工程续接以`ENGINEERING_HANDOFF.md`最新条目为准。

开发：`npm install`、`npm run desktop`；前端预览`npm run dev`。浏览器只能预览角色与设置，不能证明全局输入、置顶、穿透、系统托盘等Windows能力。

''' 
(ROOT / 'README.md').write_text(readme, encoding='utf-8')
report = ROOT / 'TEST-REPORT.md'
report.write_text(summary + '以下为历史验证记录，旧通过不能自动覆盖当前版本。\n\n' + report.read_text(encoding='utf-8-sig'), encoding='utf-8')
delivery = ROOT / 'deliveries/20261011-desktop-0.6.9'
(delivery / 'README.md').write_text(readme, encoding='utf-8')
status = {'savedAt': now, 'appVersion': '0.6.9', 'publishedAppVersion': '0.6.9', 'nativeVersion': 71,
    'unitTestFiles': 14, 'unitTestsPassed': 71, 'nativeBuildExitCode': 0,
    'inputBlinkBrowserSdkPass': True, 'actualAppAnimationClockPass': True,
    'newWindowsRunVerified': True, 'nativeScaleAndRestartVerified': True,
    'nativeAutomaticBlinkObserved': True, 'runtimeBlinkFramesReviewed': True,
    'currentUserScale': 1, 'formalArtComplete': False,
    'installerInstallUninstallVerified': False, 'multiDpiVerified': False,
    'windowsEvidence': 'build/desktop-0.6.9-ui-20261006/windows-verification-status.json',
    'next': 'Prioritize concrete daily-use defects and visible art issues; avoid repeated checks and micro-polish.'}
status_path = HERE / 'build/input-blink-20261008/release-status.json'
previous = json.loads(status_path.read_text(encoding='utf-8'))
if previous.get('appVersion') != '0.6.9':
    historical = status_path.with_name('release-status-0.6.7-historical-20261009.json')
    if not historical.exists():
        historical.write_text(json.dumps(previous, indent=2) + '\n', encoding='utf-8')
status_path.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('0.6.9 delivery, latest progress, README and truthful acceptance boundaries saved.')
