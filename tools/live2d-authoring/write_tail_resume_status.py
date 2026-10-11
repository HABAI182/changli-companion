"""Write honest continuation status before creating recovery archives."""
import hashlib
from datetime import datetime
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
working=HERE/'ChangliReferenceRepair-v57-candidate.cmo3'
digest=hashlib.sha256(working.read_bytes()).hexdigest().upper()
section=f'''# 当前续接：{datetime.now():%Y-%m-%d %H:%M}，已发布 Windows 0.6.2/v56；工作源 v57 尚未验收

用户当前优先要求：左侧尾羽补完整、修正画面中的键盘朝向/键位；正式Live2D桌宠完成后才关机，不添加专注等额外功能。

原生工作文件：tools/live2d-authoring/ChangliReferenceRepair-v57-candidate.cmo3，SHA256 {digest}。已保存独立快照，见 build/LATEST-RECOVERY-20261006.json。

上一份v57官方导出对应源SHA256为2998074FB5553B43BFA7E27C22768C9B784CDA8D4E19EEAD28B8AC37DA211103，与当前源不同。暂存脚本拒绝把两份源混为一份；候选未发布。旧报告529姿态及键盘边界通过，但原生物理旧检查遗漏新尾羽子层，整体报告为失败；本轮已加入该子层允许随SideHairLeftSwing运动，阈值未放宽，因本地网络拒绝连接尚未重新执行。

左侧尾羽缺口已定位：上次真实SDK中立图与原图不透明范围比较，指定上方连接区域缺281像素，y932以下尾尖区域缺639像素，整个指定尾羽区域缺921像素。此为保存的上一份导出图诊断，不是当前源的运行验收。旧补片只覆盖y820..932、顺序389；还遗漏上方连接和延伸至y946附近的尾尖。

已准备 ChangliOriginalLeftTailComplete-v2.psd，原图RGB和alpha逐字节核对一致，未重画。两层：主体(0,750,185,932)，计划389；尾尖(0,932,145,950)，计划410，均随SideHairLeftSwing。尾尖要在桌面400之前显示，并避开鼠标和手。**尚未导入Cubism**，不能声称缺口已经修好。

下一步：恢复电脑操作连接后，打开v57当前源，另存新版本；替换旧尾羽补片，避免多个可见尾羽叠加，分别设置主体/尾尖层级和父变形器；确认新网格ID再同步计数和物理作用范围。保存、重新官方导出，运行Core/物理/尾羽alpha检查和多姿态视觉检查，尤其检查尾尖、鼠标重影、桌面边界；再发布桌宠、打包并实机验收。

当前阻碍：电脑操作工具原生管道无法连接，按技能重试和重初始化均失败；用户已被请求重连。当前沙箱访问127.0.0.1:1420报connect EACCES，网络权限请求未获授权，本轮不能重跑浏览器/SDK检查。详见 build/CURRENT-OPERATIONAL-BLOCKERS-20261008.json。未执行关机，因为正式Live2D和本轮原生修正尚未完成。

当前Windows交付仍是0.6.2/v56，历史实机验证不重做，也不能算成v57的实机验证。完整恢复指针见 build/desktop-integration-20261006/CURRENT-RELEASE-RECOVERY.json，须区分nativeVersion与nativeWorkingVersion。正式美术、其他裁边/接缝、安装卸载、多DPI等仍待验收。

以下为历史记录，不能用旧顶部说明覆盖本条。

'''
for target in (ROOT/'ENGINEERING_HANDOFF.md',ROOT/'PROGRESS-CHECKPOINT-20261008.md'):
    target.write_text(section+target.read_text(encoding='utf-8-sig'),encoding='utf-8')
print('Saved current v57/published v56 continuation status.')
