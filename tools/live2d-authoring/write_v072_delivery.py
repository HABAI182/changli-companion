"""Save the implementation, measured scope and remaining work truthfully."""
import json,hashlib,sqlite3
from pathlib import Path
from datetime import datetime
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
F=HERE/'build/desktop-0.7.2-ui-20261006'
D=ROOT/'deliveries/20261011-desktop-0.7.2'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
qa=load(HERE/'build/interactions-0.7.2-20261011/verification.json')
assert qa['pass'] and all(sha(ROOT/p)==h for p,h in qa['sourceSha256'].items())
artifacts=load(D/'SHA256.json');assert all(sha(D/p['file'])==p['sha256'] for p in artifacts)
initial=load(F/'native-original-settings.json'); geometry=load(F/'native-original-geometry.json')
db=Path.home()/'AppData/Roaming/local.changli.companion/companion.sqlite3'
with sqlite3.connect(f'file:{db.as_posix()}?mode=ro',uri=True) as c:
 final=json.loads(c.execute('SELECT json FROM state WHERE id=1').fetchone()[0])['settings']
 slot3=json.loads(c.execute('SELECT json FROM window_positions WHERE slot=3').fetchone()[0])
assert all(final.get(k)==v for k,v in initial.items()),'Do not reset existing preferences.'
assert slot3==geometry
snapped=load(F/'edge-snap-geometry.json')[0];restored=load(F/'position-restored-geometry.json')[0]
assert snapped['originX']==2002 and snapped['originY']==geometry['y']
assert restored['originX']==geometry['x'] and restored['originY']==geometry['y'] and restored['width']==geometry['width'] and restored['height']==geometry['height']
assert not any(w['title']=='离火长明' for w in load(F/'fullscreen-visible-windows.json'))
assert len([w for w in load(F/'fullscreen-restored-windows.json') if w['title']=='离火长明'])==1
write(F/'native-final-settings.json',final)
images=['native-launch-final.jpg','native-key-z.jpg','native-key-u.jpg','native-fullscreen.jpg','native-fullscreen-restored.jpg','native-edge-snap.jpg','native-position-saved.jpg','native-position-restored.jpg']
assert all((F/p).is_file() for p in images)
now=datetime.now().astimezone().isoformat()
write(F/'windows-verification-status.json',{'savedAt':now,'appVersion':'0.7.2','nativeVersion':71,
 'nativeBuildExitCode':0,'nativeLaunchVerified':True,'nativeGlobalKeysObserved':True,
 'nativeLeftZoneHandOcclusionFixedObserved':True,'fullscreenFixtureHideRestoreVerified':True,
 'nativeDragHandleReleaseSnapVerified':True,'nativePositionSaveRestoreVerified':True,
 'nativeFreePointerDragLiftVerified':False,'nativeMouseVariantsVisuallyVerified':False,
 'allExistingUserSettingsPreserved':True,'sourceSha256':qa['sourceSha256'],'artifacts':artifacts,
 'proofImages':[{'file':p,'sha256':sha(F/p)} for p in images],
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,
 'completeWindowsAcceptance':False,'formalArtComplete':False,
 'scope':'Windows Z/U, same-monitor fullscreen test fixture hide/restore, drag-handle down/up edge snap (1984 -> 2002), position 3 save/restore (1984,866,100%) observed. Drag lift/mouse variant geometry verified in actual browser App/SDK. Final build changes only isolate the fullscreen fixture from the default pet WebView.'})
summary=f'''# 当前交付：0.7.2 / 长离原生 Live2D v71

更新时间：{now}。目标：Windows Live2D 桌宠。本轮按用户选择完成候选2、3、4、5，优先修复左键区遮手。

- 遮挡：ArtMesh9/10 在胸部 ArtMesh34 前方绘制。保持64原图像素键盘横移、所有区域共用长离左手、鼠标共用右手。真实App验证Q/A/Z/1、U/L/M/9和空格；Windows外部Z/U实际观察到手完整显示，另一只手不跟按。只改变绘制期间顺序，绘制后恢复Core顺序；不修改原MOC3、贴图、SDK或Cubism源。
- 2 拖动反馈：双手抬起约56原图像素，饰品/头部随拖动晃动，松手回弹并归位，快速拖动使凤凰受惊。可关闭。实际App浏览器拖动观察双手抬起约54像素、最终0残留；Windows手柄按下/松开已触发原生磁吸，自由拖拽全过程的视觉效果尚未完整实机验收。
- 3 全屏自动避让：500ms检查同一显示器的外部前台无边框全屏窗口；隐藏桌宠，退出后恢复，避免普通最大化窗口误触发。手动隐藏不会被自动恢复，托盘/恢复快捷键可主动显示。Windows本地独立全屏测试窗口隐藏/恢复已通过；未穷举所有游戏/视频软件；按应用例外列表尚未实现，可用总开关关闭。
- 4 边缘磁吸与3个常用位置：拖动松手时在24逻辑像素内吸附，留12逻辑像素边距；SQLite保存3个位置，恢复时保留当前大小。原生手柄松开使x从1984吸附至2002，位置3保存并恢复(1984,866)、100%大小通过。位置3留作你的原位置，可覆盖；位置1/2未占用。
- 5 鼠标动作细分：左键普通按压；右键较轻按压并倾手；滚轮上下拨动；连续点击轻弹。全部仍归鼠标手，鼠标本体/线缆保留移动联动。实际App左键/右键/滚轮压力分别约26/17/8，键盘手压力0；滚轮方向和关闭开关检查通过。原模型没有独立手指网格，因此未宣称新增精细手指美术。Windows原生鼠标消息已接入，视觉变体尚未逐一实机验收。
- 设置增加4个开关、3个位置卡片；浏览器禁用原生专属控件。全部原有用户偏好保持（100%、60fps、优先Live2D、气泡关闭等），新开关默认开启，设置保存后写入旧数据。

类型检查、17文件77前端测试、9原生测试通过；安装版/便携EXE构建退出0。已使用cli-anything-live2d验证30个引用资源。当前程序直接运行，不依赖开发服务器。

已交付：deliveries/20261011-desktop-0.7.2/changli-companion.exe，同目录有安装包与SHA256.json；0.7.1保留回退。原生模型仍为43网格/36参数v71。 verified source 849400CB… / MOC3 7449806D… 未改。另存工作源918F878B…未重新验收，单独保留，不能当作当前发布源。

未完成：9个精细表情、4段完整原生动画；安装卸载、多屏/DPI全面验收；全屏按应用例外列表；Windows自由拖拽和鼠标变体逐项视觉验收。formalArtComplete=false。候选1/6/7/8未授权实施。没有新增专注/待办。

本轮进度先保存了162624代码检查点，最终完整恢复指针：tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。后续先读本条与最终验收记录，不重复本轮已实现功能；优先补齐精细表情/原生动画。不要覆盖已验证Cubism源，不关机。
'''
(ROOT/'DELIVERY-0.7.2.md').write_text(summary,encoding='utf-8',newline='\n')
for name in ['ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261011.md','TEST-REPORT.md']:
 p=ROOT/name;p.write_text(summary+'\n以下为历史记录。\n\n'+p.read_text(encoding='utf-8-sig'),encoding='utf-8',newline='\n')
readme='''# 离火长明 · Q版长离 Live2D 桌宠

当前工程版 **0.7.2 / 原生模型v71**，Windows x64。

直接运行 deliveries/20261011-desktop-0.7.2/changli-companion.exe，无需开发服务器。新增拖动抬手/回弹、全屏避让、边缘磁吸与3个常用位置、鼠标左右键/滚轮细分，并修复左键区手被胸部遮挡。

键盘全区域共用长离左手，按左右键区横移，空格回中。鼠标本体/线缆与右手联动。右键角色打开菜单→设置，四项新功能有独立开关；位置3已保存为本轮原位置，可覆盖。

保留8基础表情、36条气泡、50%—200%连续大小、透明置顶、托盘/穿透恢复。气泡保持你原来的关闭偏好。9精细表情、4完整原生动画及部分Windows验收仍未完成，详见 DELIVERY-0.7.2.md。

续接读 ENGINEERING_HANDOFF.md，完整恢复指针在 tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。候选2/3/4/5本轮已做；1/6/7/8尚未施工，不加入专注/待办。

开发 npm run desktop；浏览器预览 npm run dev。浏览器拖动仅预览动画，全屏避让/磁吸/位置等Windows功能只在原生程序可用。
'''
(ROOT/'README.md').write_text(readme,encoding='utf-8',newline='\n');(D/'README.md').write_text(readme,encoding='utf-8',newline='\n')
options=ROOT/'FEATURE-OPTIONS-20261011.md'
options.write_text('''# 桌宠功能选择进度（0.7.2）

用户已选2、3、4、5，本轮已实现并提供开关。验收边界见 DELIVERY-0.7.2.md。

| 编号 | 功能 | 当前状态 |
|---|---|---|
| 1 | 按键有性格 | 未选择，未施工 |
| 2 | 拖拽有反应 | 抬手、随动、回弹、凤凰受惊已实现；实际App动画通过 |
| 3 | 全屏自动避让 | 同屏隐藏/恢复Windows通过；可关闭；按应用例外尚未实现 |
| 4 | 屏幕边缘磁吸 | 边缘吸附、3个位置保存/恢复Windows通过 |
| 5 | 鼠标动作细分 | 左右键压力、倾手、上下滚轮、连续点击回弹；实际App通过；没有独立手指新美术 |
| 6 | 昼夜回应 | 未选择，未施工 |
| 7 | 一键收纳 | 未选择，未施工 |
| 8 | 双击小动作 | 未选择，未施工 |

保留已有桌面功能、8基础表情、36气泡；不加入专注/待办/联网聊天。9个精细表情、4段原生动画仍待补齐。
''',encoding='utf-8',newline='\n')
status=HERE/'build/input-blink-20261008/release-status.json'
old=load(status);write(status.with_name('release-status-0.7.1-historical-20261011.json'),old)
write(status,{'savedAt':now,'appVersion':'0.7.2','publishedAppVersion':'0.7.2','nativeVersion':71,
 'unitTestFiles':17,'unitTestsPassed':77,'nativeTestsPassed':9,'nativeBuildExitCode':0,
 'actualAppInteractionsPass':True,'newWindowsRunVerified':True,
 'nativeLeftZoneHandOcclusionFixedObserved':True,'fullscreenFixtureHideRestoreVerified':True,
 'nativeDragHandleReleaseSnapVerified':True,'nativePositionSaveRestoreVerified':True,
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,'formalArtComplete':False,
 'remainingExpressions':9,'remainingAuthoredAnimations':4,'windowsEvidence':'build/desktop-0.7.2-ui-20261006/windows-verification-status.json'})
print('0.7.2 delivery, verification boundaries and next work saved.')
