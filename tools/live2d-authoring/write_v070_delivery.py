"""Save truthful 0.7.0 delivery and remaining-work inventory."""
import hashlib,json,sqlite3
from pathlib import Path
from datetime import datetime
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
F=HERE/'build/desktop-0.7.0-ui-20261006'
D=ROOT/'deliveries/20261011-desktop-0.7.0'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def write(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
qa=load(HERE/'build/interactions-0.7.0-20261011/verification.json')
assert qa['pass'] and qa['appVersion']=='0.7.0'
assert all(sha(ROOT/p)==h for p,h in qa['sourceSha256'].items())
artifacts=load(D/'SHA256.json')
assert all(sha(D/x['file'])==x['sha256'] for x in artifacts)
assert load(HERE/'build/interactions-0.7.0-20261011/bubble-bounds.json')['pass']
initial=load(F/'native-original-settings.json')
db=Path.home()/'AppData/Roaming/local.changli.companion/companion.sqlite3'
with sqlite3.connect(f'file:{db.as_posix()}?mode=ro',uri=True) as con:
 final=json.loads(con.execute('SELECT json FROM state WHERE id=1').fetchone()[0])['settings']
assert final==initial,'Preserve user preferences; restore only test changes.'
write(F/'native-final-settings.json',final)
assert '轻一点，发饰会乱。' in (F/'final-bubble-1.txt').read_text(encoding='utf-8')
assert '这样就很安心。' in (F/'final-bubble-2.txt').read_text(encoding='utf-8')
names=['final-key-q.png','final-key-u.png','final-bubble-1.png','final-bubble-2.png','final-settings.png']
assert all((F/x).is_file() for x in names)
saved=load(Path.home()/'AppData/Roaming/local.changli.companion/model.json')
assert 49 in saved['key_bindings']['left_vkeys'] and 57 in saved['key_bindings']['right_vkeys']
now=datetime.now().astimezone().isoformat()
win={'savedAt':now,'appVersion':'0.7.0','nativeVersion':71,'nativeBuildExitCode':0,
 'nativeLaunchVerified':True,'nativeTransparentPetVisible':True,'nativeSettingsLoaded':True,
 'nativeExternalKeyboardQAndUObserved':True,'nativeBubblesVariedAndUncroppedObserved':True,
 'nativeKeyRegionMigrationVerified':True,'allUserSettingsPreserved':True,
 'actualAppKeyboardZonesPass':qa['hands'],'actualAppMousePass':qa['mouse'],
 'actualAppRapidKeysPass':qa['rapid'],'actualAppExpressionCount':8,
 'nativeFaceAcceptanceScope':'Head-touch smile/default observed; all eight presets reviewed in the real browser App.',
 'installerGenerated':True,'installerInstallUninstallVerified':False,
 'multiDpiVerified':False,'completeWindowsAcceptance':False,'formalArtComplete':False,
 'sourceSha256':qa['sourceSha256'],'artifacts':artifacts,
 'proofImages':[{'file':x,'sha256':sha(F/x)} for x in names]}
write(F/'windows-verification-status.json',win)
summary=f'''# 当前交付：0.7.0 / 长离原生 Live2D v71

更新时间：{now}。目标为 Windows 长离 Live2D 桌宠。当前目录没有 Git 仓库或适用的 AGENTS.md，以源码、原生备份和恢复包续接。

本轮已完成：

- 键盘所有左右区域共用长离左手，左区向左、右区向右，空格回中；右手负责鼠标。A/L 只是示例，不是两个特殊键。覆盖字母、数字行、功能键、标点及辅助区；旧安装补齐原先未分配的键，不覆盖已有自定义区域。两种输入模式都遵循此规则，纯键盘模式忽略鼠标。
- 键盘手平滑左右移动、松开归位；鼠标手小幅二维跟随。运行时给原生网格叠加，原 MOC3、UV 和拓扑不变；每帧还原，避免累积漂移。不是逐个键帽精准定位，也未制作鼠标物体独立运动。
- 36 条互动回应，覆盖摸头、身体、凤凰、拖动、醒来、打字和待机，同一主题不连续重复，有冷却；关闭气泡时不空口说话。保留用户原有气泡关闭偏好，需看回应请在设置启用。修正气泡和按键提示被透明窗口顶部裁切。
- 8 个基础运行时表情：默认、开心、惊讶、困倦、思考、无语、认真、疑惑。后四项在“更多选项”。开心闭眼弧线与嘴形、惊讶张嘴、困倦半闭眼有实际变化。未制作的快捷表情不可选，标注待制作。这是基础参数/网格效果，不是新完成的精细原生表情组。
- 保留已交付的透明置顶、拖动、全局输入、托盘/穿透恢复、30/60fps 连续动画、发束饰品物理、凤凰反馈、卡片设置、50%—200%连续大小；没有新增专注/待办。

验证：15 文件73测试、类型检查通过；实际 App/Core 核对 Q/A/Z/1 左区、U/L/M/9 右区、空格中区，均同一键盘手按压，快速交替没有双手误触，鼠标移后复位；8 表情画面、不同气泡和12秒364次动画更新通过。Live2D CLI 检查28个资源齐全。Windows 最终 EXE 已运行，外部 Q/U 可移动同一手、气泡完整且两次不同，旧配置补齐数字区域成功，设置已加载。浏览器网格数值与 Windows 观察分别记录，不当作全套桌面验收。

交付：deliveries/20261011-desktop-0.7.0/changli-companion.exe 和同目录安装包，SHA256.json 校验。无需开发服务器。用户全部原有偏好已恢复，大小100%、60fps、气泡关闭。

仍未完成：9 个精细表情（脸红、大笑、生气、嘟嘴、害羞、委屈、得意、凤凰眼、火焰眼）；挥手、入睡过渡、生气冒火、害羞完整原生动画；凤凰互动仍为标注的试作动作；部分大角度头颈/袖口与饰品美术、呆毛精修。安装卸载、多屏/DPI 未完整验收。formalArtComplete=false，不能称完整美术正式版。

原生源没有覆盖或二进制修改。正式配对源为 build/ChangliReferenceRepair-v71-20261006.cmo3（849400CB…）；11:41另存的当前工作源（918F878B…）未重新验收，独立保存。恢复指针：tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。本条后保存代码及完整当前版恢复包，不关机。

下一步优先处理实际可见缺陷，再制作剩余原生表情/动画；不要重做已完成的键盘分区、设置和尾羽，不把旧报告自动当作当前验收。
'''
(ROOT/'DELIVERY-0.7.0.md').write_text(summary,encoding='utf-8')
for name in ['ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261011.md','TEST-REPORT.md']:
 p=ROOT/name;p.write_text(summary+'\n以下为历史记录，旧映射已由最新规则取代。\n\n'+p.read_text(encoding='utf-8-sig'),encoding='utf-8')
readme='''# 离火长明 · Q版长离 Live2D 桌宠

当前可用工程版 **0.7.0 / 原生模型 v71**，Windows x64。

双击 deliveries/20261011-desktop-0.7.0/changli-companion.exe 即可运行；同目录提供安装包和 SHA256 校验。右键打开表情/凤凰/设置，底部按钮拖动位置。

键盘所有左右区域都由长离左手移动并按压，右手响应鼠标。空格让左手回中；支持字母和数字行，不限 A/L。鼠标手小幅跟随，36 条互动回应不连续重复。8 个基础表情，未完成的精细表情如实标注。大小50%—200%连续调节，设置自动保存；用户当前100%、60fps、气泡关闭偏好保留，要看互动回应请打开设置中的气泡。

这是加载真实 Cubism 模型的 Windows 透明桌宠。完整原生美术、剩余表情/动画及安装卸载、多屏DPI验收仍有缺项，详见 DELIVERY-0.7.0.md。续接读 ENGINEERING_HANDOFF.md 最新条目，恢复包指针为 tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json。

开发：npm install、npm run desktop；浏览器预览 npm run dev。浏览器不具备全局输入、系统托盘、窗口置顶和穿透等 Windows 能力。
'''
(ROOT/'README.md').write_text(readme,encoding='utf-8');(D/'README.md').write_text(readme,encoding='utf-8')
p=HERE/'build/input-blink-20261008/release-status.json';old=load(p)
if old.get('appVersion')!='0.7.0':write(p.with_name('release-status-0.6.9-historical-20261011.json'),old)
write(p,{'savedAt':now,'appVersion':'0.7.0','publishedAppVersion':'0.7.0','nativeVersion':71,
 'unitTestFiles':15,'unitTestsPassed':73,'nativeBuildExitCode':0,
 'actualAppInteractionsPass':True,'actualAppAnimationClockPass':True,
 'newWindowsRunVerified':True,'nativeBubblesUncroppedObserved':True,
 'nativeRegionMigrationVerified':True,'formalArtComplete':False,
 'installerInstallUninstallVerified':False,'multiDpiVerified':False,
 'windowsEvidence':'build/desktop-0.7.0-ui-20261006/windows-verification-status.json',
 'remainingExpressions':9,'remainingAuthoredAnimations':4,'currentUserScale':final['scale']})
print('0.7.0 delivery and remaining-work inventory saved.')
