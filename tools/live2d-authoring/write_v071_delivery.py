"""Record only the current pointer update, native observations and recovery."""
import json,hashlib,sqlite3
from pathlib import Path
from datetime import datetime
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
F=HERE/'build/desktop-0.7.1-ui-20261006'
D=ROOT/'deliveries/20261011-desktop-0.7.1'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
qa=load(HERE/'build/interactions-0.7.1-20261011/verification.json')
assert qa['pass'] and all(sha(ROOT/p)==h for p,h in qa['sourceSha256'].items())
artifacts=load(D/'SHA256.json');assert all(sha(D/p['file'])==p['sha256'] for p in artifacts)
initial=load(F/'native-original-settings.json')
db=Path.home()/'AppData/Roaming/local.changli.companion/companion.sqlite3'
with sqlite3.connect(f'file:{db.as_posix()}?mode=ro',uri=True) as c:
 final=json.loads(c.execute('SELECT json FROM state WHERE id=1').fetchone()[0])['settings']
assert final==initial,'Do not reset user preferences.'
write(F/'native-final-settings.json',final)
images=['native-launch.png','native-key-q.png','native-key-u.png','native-mouse-left.png','native-mouse-right.png']
assert all((F/p).is_file() for p in images)
now=datetime.now().astimezone().isoformat()
write(F/'windows-verification-status.json',{'savedAt':now,'appVersion':'0.7.1','nativeVersion':71,
 'nativeBuildExitCode':0,'nativeLaunchVerified':True,'nativeGlobalKeysObserved':True,
 'nativeHandAndMouseMovementObserved':True,'allUserSettingsPreserved':True,
 'sourceSha256':qa['sourceSha256'],'artifacts':artifacts,
 'proofImages':[{'file':p,'sha256':sha(F/p)} for p in images],
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,
 'completeWindowsAcceptance':False,'formalArtComplete':False,
 'scope':'Windows launch, external Q/U reach and mouse/cable movement observed. Numeric geometry belongs to actual browser App/SDK evidence; expressions/clock were not rerun this stage.'})
summary=f'''# 当前交付：0.7.1 / 长离原生 Live2D v71

更新时间：{now}。目标为真正的 Windows Live2D 桌宠。本轮只调整输入可见反馈，没有追加候选功能。

- 所有键盘区域仍由长离左手按压，按键左右区域只控制同一只手的位置；横移幅度从24增至64原图像素（约2.7倍），空格回中。真实 App 检查左区 Q/A/Z/1、右区 U/L/M/9，以及快速交替和归位，未误触鼠标手。
- 鼠标移动从8增至18原图像素。鼠标手、鼠标本体和线缆同步位移。原鼠标与旧键盘/身体共用 ArtMesh20 前景片，渲染时沿鼠标轮廓划分临时三角形，仅移动鼠标区域；键盘/身体顶点保持原位置。静止时复用原UV采样；原MOC3、贴图、Cubism工程和SDK源码均没有修改。
- 实际 App/SDK 记录手与鼠标区域同向移动约15原图像素、静态区域0位移，停止后归位。鼠标图层划分覆盖原三角形的几何检查通过，避免漏画或重叠。本次16文件74测试和类型检查通过；EXE/NSIS构建退出0，Windows0.7.1已真实运行并观察外部Q/U左右移动与鼠标本体联动。没有重复验收未变的眨眼时钟或全部表情。
- 保留0.7.0的36条气泡与8基础表情、50%—200%连续大小和桌面能力，用户全部原有偏好保持不变。9个精细表情、4段完整原生动画仍未完成；安装卸载、多屏/DPI尚未完整验收。formalArtComplete=false。

交付文件：deliveries/20261011-desktop-0.7.1/changli-companion.exe；同目录安装包和SHA256.json。无需开发服务器。0.7.0保留为回退版本。

功能候选见 FEATURE-OPTIONS-20261011.md：按键性格、拖拽反馈、全屏避让、边缘磁吸、鼠标动作细分、昼夜回应、收纳和双击小动作。仅列方案，未施工。优先建议按键性格、拖拽反馈、全屏避让，不加入专注/待办等额外功能。

正式模型配对源仍为 build/ChangliReferenceRepair-v71-20261006.cmo3（849400CB…）；另存工作源（918F878B…）未重新验收，分别保留。代码检查点和完整恢复包指针为 tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。本条后保存，未经用户选择不开发候选项，不关机。
'''
(ROOT/'DELIVERY-0.7.1.md').write_text(summary,encoding='utf-8')
for name in ['ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261011.md','TEST-REPORT.md']:
 p=ROOT/name;p.write_text(summary+'\n以下为历史记录。\n\n'+p.read_text(encoding='utf-8-sig'),encoding='utf-8')
readme='''# 离火长明 · Q版长离 Live2D 桌宠

当前可用工程版 **0.7.1 / 原生模型 v71**，Windows x64。

直接运行 deliveries/20261011-desktop-0.7.1/changli-companion.exe，无需开发服务器；同目录有安装包和校验。键盘全区域共用长离左手，按左右键区横移，空格回中；移动幅度已加大。鼠标本体、线缆与右手同步移动，桌面/键盘固定。

已有8基础表情、36条气泡回应、50%—200%连续大小、透明置顶、托盘/穿透恢复。气泡保持用户原来的关闭偏好，需要时在设置开启。仍有精细表情/原生动画及安装、多屏DPI验收未完成，详见 DELIVERY-0.7.1.md。

候选功能仅列在 FEATURE-OPTIONS-20261011.md，等待用户选择。续接读 ENGINEERING_HANDOFF.md 最新条目，恢复指针为 tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。

开发：npm install，npm run desktop；浏览器预览 npm run dev。浏览器不能证明全局输入、托盘、置顶和穿透等 Windows 能力。
'''
(ROOT/'README.md').write_text(readme,encoding='utf-8');(D/'README.md').write_text(readme,encoding='utf-8')
p=HERE/'build/input-blink-20261008/release-status.json';old=load(p)
if old.get('appVersion')!='0.7.1':write(p.with_name('release-status-0.7.0-historical-20261011.json'),old)
write(p,{'savedAt':now,'appVersion':'0.7.1','publishedAppVersion':'0.7.1','nativeVersion':71,
 'unitTestFiles':16,'unitTestsPassed':74,'nativeBuildExitCode':0,'actualAppInteractionsPass':True,
 'newWindowsRunVerified':True,'nativeHandAndMouseMovementObserved':True,
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,'formalArtComplete':False,
 'currentUserScale':final['scale'],'remainingExpressions':9,'remainingAuthoredAnimations':4,
 'windowsEvidence':'build/desktop-0.7.1-ui-20261006/windows-verification-status.json'})
print('0.7.1 delivery and unimplemented feature candidates saved.')
