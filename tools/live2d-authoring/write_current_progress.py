"""Refresh authoritative handoff from actual reports; retain older entries as history."""
import json
from datetime import datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
app=load(ROOT/'package.json')['version']
native=load(HERE/'build/LATEST-RECOVERY-20261006.json')
status_file=HERE/f'build/desktop-{app}-ui-20261006/windows-verification-status.json'
status=load(status_file) if status_file.exists() else {}
now=datetime.now().astimezone().isoformat(timespec='seconds')
header=f'''# 当前进度：{now}，桌宠 {app} / 原生 Live2D v60

用户最新要求是“左侧尾羽修完后继续往下做”，取代此前关机要求。本轮不关机，目标始终是正式长离 Live2D Windows 桌宠，不添加专注/待办功能。

已完成左侧尾羽缺角：原图主体与尾尖以原始 RGBA 像素包装 PSD，实际导入 Cubism，新增 ArtMesh57/58；主体顺序389、尾尖410，旧不完整 ArtMesh55 原生不透明度0。官方 SDK 静止图在指定尾羽原图不透明范围内，缺失像素921降至0（上方281、尾尖639均为0）。该指标只代表指定中立轮廓，另有运动截图验收。

v59 把 SideHairLeftSwing / Rotation6 两端从 -9/+8.4 度改为 -1.5/+1.5 度，保留中立0度。43网格中仅5个旋转子层的非中立几何改变，严格与旧模型等效角度比较通过；其余38个网格不变。左右满摆幅、实际转头及按键姿态的截图不再出现矩形尾根裂口。

v60 继续修耳饰连接层 SOURCE LeftEarJoin / ArtMesh33：仅将绘制顺序500改为385，原生父变形器 LeftCuffAttachment 不变。全部43网格在529姿态下几何、UV、索引、遮罩和不透明度不变；官方原生物理与持续模拟通过。八个实际桌宠姿态已人工核对，发束遮住上方直线裁边，下方重复横切线减轻；局部自然轮廓和大角度头颈/袖口接缝仍需精修。

键盘已替换为面向角色的可替换生成素材，空格位于靠角色的一行，中立时部分被手遮挡。这是沿用的朝向假设，不把生成素材说成官方原图。原图尾羽素材未重画。

0.6.3/v59 已从交付目录实机运行：透明角色、尾羽及键盘可见，开心闭眼/默认恢复、独立设置及 Live2D 已加载观察通过。在前台资源管理器用 Sky 按 A/J，后台计数左/右均0到1；不是物理硬件输入验收。65测试通过，Tauri构建退出0。

当前 {app} 的实机记录已存在：{bool(status)}；实际原生启动验证：{status.get('nativeLaunchVerified', False)}。以 build/desktop-{app}-ui-20261006/windows-verification-status.json 为准，不能将旧版本实机证明复制算成新版本验收。

最新可编辑源：tools/live2d-authoring/ChangliReferenceRepair-v60-candidate.cmo3。SHA256 {native['workingSha256']}。独立快照：{native['latestWorkingSnapshot']}。原生 v60 官方导出、CLI validate/lint、Core/物理和尾羽中立 alpha 均通过，见 build/native-export-pipeline-v60-20261006.json。安装卸载、多DPI、全部动作与正式美术未验收。

当前仓库仍无 .git，未发现适用 AGENTS.md；不能声称已 Git 提交。修改、原生工程、官方运行资源、交付 EXE/安装包与验证记录均保存；完整恢复指针为 tools/live2d-authoring/build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json，需校验 SHA256 与 ZIP CRC。

下一项：精修头颈/袖口随头动时的轮廓接缝，检查主金饰独立运动、凤凰羽片遮挡和闲置动作节奏。保留本轮通过的尾羽、眼球与脸部关键形，不重复制作。

## 以下为历史记录，旧阻碍与旧关机请求均已被本条取代

'''
marker='## 以下为历史记录，旧阻碍与旧关机请求均已被本条取代'
for name in ('ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261008.md'):
    p=ROOT/name;old=p.read_text(encoding='utf-8') if p.exists() else ''
    if marker in old:old=old.split(marker,1)[1].lstrip('\r\n')
    p.write_text(header+old,encoding='utf-8')
delivery=f'''# 长离桌宠 {app}，美术精修版本

运行 deliveries/20261008-desktop-{app}/changli-companion.exe；安装包在同目录。实际构建退出状态、产物 SHA256 和实机结果见交付目录 SHA256.json 与 tools/live2d-authoring/build/desktop-{app}-ui-20261006/windows-verification-status.json。

本轮补齐左侧尾羽并调整摆幅，修正耳饰底层遮挡，接入面向角色的替换键盘。尾羽使用原图现有像素；键盘为明确标注的可替换生成素材。角色仍是制作中，未宣称符合正式最终美术验收。

已通过：Cubism 5.3官方 MOC3导出、43图层/36参数、529姿态几何回归、原生物理1200帧、尾羽指定中立轮廓缺失0。原生 Windows 能力以本版实机记录为准，浏览器测试不算 Windows 功能验收。

未完成：精细头颈/袖口接缝、主金饰/凤凰精细运动、完整扩展表情和闲置动作视觉验收；安装卸载与多DPI验收。没有专注或待办功能。

工程和进度恢复入口：PROGRESS-CHECKPOINT-20261008.md；最新编辑源 ChangliReferenceRepair-v60-candidate.cmo3；本轮不关机。
'''
(ROOT/f'DELIVERY-{app}.md').write_text(delivery,encoding='utf-8')
blockers={'savedAt':now,'goal':'正式长离 Live2D Windows 桌宠','computerUse':{'available':True,'previousNativePipeErrorResolved':True},
 'localRuntimeQa':{'executedThisTurn':True,'previousEaccesResolved':True},'tailFixV2':{'nativeIntegrated':True,'neutralAlphaPass':True},
 'sourceExport':{'matches':True,'currentVersion':60,'workingSha256':native['workingSha256']},
 'shutdownRequestedAfterCompletion':False,'shutdownRequestSupersededBy':'修完继续往下做','shutdownPerformed':False,
 'formalArtComplete':False,'currentAppVersion':app,'windowsDesktopVerifiedThisVersion':status.get('nativeLaunchVerified',False)}
(HERE/'build/CURRENT-OPERATIONAL-BLOCKERS-20261008.json').write_text(json.dumps(blockers,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Updated authoritative progress and delivery note; old blockers and shutdown intent superseded.')
