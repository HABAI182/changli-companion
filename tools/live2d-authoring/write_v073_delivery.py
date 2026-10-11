"""Record current release and its measured verification boundaries."""
import hashlib,json,sqlite3
from pathlib import Path
from datetime import datetime
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
F=HERE/'build/desktop-0.7.3-ui-20261006'
D=ROOT/'deliveries/20261011-desktop-0.7.3'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def write(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
qa=load(HERE/'build/interactions-0.7.3-20261011/verification.json')
assert qa['pass'] and all(sha(ROOT/p)==h for p,h in qa['sourceSha256'].items())
artifacts=load(D/'SHA256.json');assert all(sha(D/a['file'])==a['sha256'] for a in artifacts)
initial=load(F/'native-original-settings.json')
db=Path.home()/'AppData/Roaming/local.changli.companion/companion.sqlite3'
with sqlite3.connect(f'file:{db.as_posix()}?mode=ro',uri=True) as c:
 final=json.loads(c.execute('select json from state where id=1').fetchone()[0])['settings']
 slots=c.execute('select * from window_positions').fetchall()
assert all(final.get(k)==v for k,v in initial.items()),'Preserve existing preferences'
assert len(slots)==1 and slots[0][0]==3 and json.loads(slots[0][1])['x']==1984
bottom=load(F/'bottom-geometry.json')[0];drag=load(F/'drag-geometry.json')[0]
up=load(F/'drag-up-geometry.json')[0];down=load(F/'drag-down-geometry.json')[0]
assert (bottom['originX'],bottom['originY'])==(2004,1101)
assert (drag['originX'],drag['originY'])==(1923,1101)
assert up['originY']==1022 and down['originY']==1101 and down['width']==360 and down['height']==320
images=['native-launch.jpg','native-bottom.jpg','native-drag-handle.jpg','native-bottom-final.jpg']
assert all((F/p).is_file() for p in images)
now=datetime.now().astimezone().isoformat()
write(F/'native-final-settings.json',final)
native={'savedAt':now,'appVersion':'0.7.3','nativeVersion':71,'nativeBuildExitCode':0,
 'nativeLaunchVerified':True,'nativeDragHandleHorizontalMovementVerified':True,
 'nativeBottomReachByActualDragVerified':True,'nativeBottomHandleReachableVerified':True,
 'nativeDragGeometry':{'bottomReset':bottom,'horizontalDrag':drag,'up':up,'down':down},
 'allExistingUserSettingsPreserved':True,'existingPositionPresetsPreserved':True,
 'leftAtBottomAfterVerification':True,'sourceSha256':qa['sourceSha256'],'artifacts':artifacts,
 'proofImages':[{'file':p,'sha256':sha(F/p)} for p in images],
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,
 'completeWindowsAcceptance':False,'formalArtComplete':False,
 'scope':'0.7.3 EXE launched. Native handle dragged horizontally 81 physical pixels, up 79 and down back to bottom y1101; keyboard and handle remain above taskbar. 100 percent at host DPI only. Elastic head and phoenix measured in real App WebGL, not a new Cubism Editor export.'}
write(F/'windows-verification-status.json',native)
summary=f'''# 当前交付：0.7.3 / 原生 Live2D v71

更新时间：{now}。目标仍是 Windows 长离 Live2D 桌宠。本轮依据四张截图修整两只手的上缘、加长左尾羽、增强大头和凤凰动态，并修复底部拖动体验。

- 手部：按原贴图UV轮廓裁去两只手上方的凸出残片；清理手后方两块图层的部分残边。键盘全区域仍共用长离左手，左右区约±64原图像素横移；鼠标手与鼠标本体/线缆仍联动。没有替换角色插画。
- 左尾羽：三个相邻尾羽图层统一围绕同一位置纵向加长22%，消除仅拉长下层造成的横向接缝；尾羽随头部一起摆动。
- 大头弹性：带阻尼的弹簧保留连续输入惯性，提供更明显的位移、倾斜、挤压/伸展和越过目标后的回摆；键盘桌面保持固定。完整/轻柔/关闭动态仍可用。弹性感和袖口细节需要用户主观确认，不能宣称已经达到参考作者同等完成度。
- 凤凰：常驻翅膀摆动、尾羽摆动和轻跳，头顶火苗连续弯曲；睡眠暂停翅膀/尾羽/轻跳，关闭动态停止火苗动态。不宣称新增独立飞行动画。
- 删除效果不自然的双手抬起、倾手、滚轮拨手和连续点击手部变体；所有鼠标按钮保留同一普通按压。设置移除鼠标细分开关，拖动反应改为“拖动弹性”；旧设置字段仅用于读取既有数据。
- 拖动键移到键盘右侧、主体右下角。窗口底部透明13%不再限制可见角色位置，底边磁吸留6逻辑像素。Windows实测右下角重置(2004,1101)，手柄横向拖动到(1923,1101)，上拖至y1022、下拖回y1101成功；键盘和手柄仍在任务栏上方。测试后留在底部；原位置3未覆盖，原用户偏好全部保留。

验证：打包包含类型检查，构建退出0；17文件79个前端测试通过；10个原生测试通过。cli-anything-live2d验证28个引用文件。真实App/SDK WebGL检查通过：Z/U/空格独立键盘手、正常左右鼠标按压、头部回摆、固定键盘、动态凤凰、手柄位置、拖动不抬手均有证据。Windows运行与真正手柄拖动/底部摆放通过；这与浏览器模拟拖动分别记录。

便携EXE与安装包：deliveries/20261011-desktop-0.7.3/，SHA256.json列出校验值。旧0.7.2保留回退。源、原MOC3与8张原图集未改；本轮新增的是可替换运行时网格与动画修整，并非新Cubism原生源导出。

仍未完成：9个精细表情、4段完整原生动画；袖口/发束精细衔接的最终美术验收；多屏/DPI全面验收及安装卸载实测；全屏按应用例外列表。本轮未重复测试上一版全屏隐藏/恢复；保留其历史证据，不当成本轮新验证。formalArtComplete=false。

恢复：先读取本条，再读 build/desktop-0.7.3-ui-20261006/windows-verification-status.json 与 build/interactions-0.7.3-20261011/verification.json。18:09:58已提前保存代码检查点；最终完整恢复指针位于 tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。不要覆盖已验证v71源，未验收工作源单独保留。不要重复实施被本轮删除的抬手/鼠标变体，不加入专注/待办，不关机。
'''
(ROOT/'DELIVERY-0.7.3.md').write_text(summary,encoding='utf-8')
for name in ['ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261011.md','TEST-REPORT.md']:
 p=ROOT/name;p.write_text(summary+'\n以下为历史记录。\n\n'+p.read_text(encoding='utf-8-sig'),encoding='utf-8')
readme='''# 离火长明 · Q版长离 Live2D 桌宠

当前工程版 **0.7.3 / 原生模型v71**，Windows x64。

直接运行 deliveries/20261011-desktop-0.7.3/changli-companion.exe，无需开发服务器。本轮增强大头弹性、凤凰与火苗动态，加长左尾羽22%，裁切手上缘残片，拖动键移到键盘右下角；底部允许透明空白超出工作区，角色更靠近任务栏。

键盘全部由长离左手按压，根据左右区域横移，空格回中。右手与鼠标联动。删除抬手、倾手和滚轮拨手等变体，保留普通按压；拖动弹性有独立开关。保留全屏避让、边缘磁吸、3个位置卡片、8基础表情、36气泡、50%—200%连续大小、透明置顶、托盘/穿透恢复，保留你的原偏好。

EXE已运行，右下角手柄横向/上下拖动及底部可用性通过Windows实测；动态参数与渲染通过真实App WebGL检查。精细美术与9表情/4原生动画仍未完工，详见 DELIVERY-0.7.3.md。

开发 npm run desktop；浏览器预览 npm run dev。完整恢复指针：tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。续接先读 ENGINEERING_HANDOFF.md。
'''
(ROOT/'README.md').write_text(readme,encoding='utf-8');(D/'README.md').write_text(readme,encoding='utf-8')
options='''# 桌宠功能选择进度（0.7.3）

用户选择2/3/4/5后又指出2/5体验不好，并授权删掉。本轮2保留大头/发饰弹性，删除抬手；5删除鼠标细分变体，保留普通按压和手/鼠标联动。

3 全屏自动避让：同屏自动隐藏/恢复已在0.7.2实测，代码保留；按应用例外列表未做。
4 边缘磁吸与3位置：保留保存/恢复；本轮修复底部透明空白限制，右下角手柄真正拖动实测通过。

1/6/7/8未选择，未施工。不增加专注/待办。精细表情与完整原生动画未完工，验收边界见 DELIVERY-0.7.3.md。
'''
(ROOT/'FEATURE-OPTIONS-20261011.md').write_text(options,encoding='utf-8')
status=HERE/'build/input-blink-20261008/release-status.json'
write(status,{'savedAt':now,'appVersion':'0.7.3','publishedAppVersion':'0.7.3','nativeVersion':71,
 'unitTestFiles':17,'unitTestsPassed':79,'nativeTestsPassed':10,'nativeBuildExitCode':0,
 'actualAppInteractionsPass':True,'newWindowsRunVerified':True,'nativeBottomReachByActualDragVerified':True,
 'nativeBottomHandleReachableVerified':True,'installerInstallUninstallVerified':False,'multiDpiVerified':False,
 'formalArtComplete':False,'remainingExpressions':9,'remainingAuthoredAnimations':4,
 'windowsEvidence':'build/desktop-0.7.3-ui-20261006/windows-verification-status.json'})
print('0.7.3 delivery, observed native drag, preserved preferences and remaining work saved.')
