"""Record the native sleeve refinement without overwriting prior releases."""
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]

if __name__=='__main__':
    summary='''# 离火长明 — Q 版长离 Live2D Windows 桌宠

2026-10-06 当前为 **0.5.13 / Live2D v42 制作候选**，目标仍是按原图制作正式Live2D桌宠，接近宇痕冫的灵动体验。专注/待办已移除，历史数据保留。正式美术与全部桌面验收尚未完成。

本轮新增两项：

- v40/v41在Cubism中原生收紧左上金饰外缘五个顶点，深色三个指定局部区域亮白像素61→8、11→0、9→2。金色高光和深色描边保留，剩余细白边仍待处理。v40首次五点预期失败报告保留：顶点13未实际移动；v41独立修正后真实导出移动4原图像素。
- v42新增 `LeftCuffAttachment / Warp13`，仅控制 `ArtMesh33 / SOURCE LeftEarJoin`。原生侧头参数三关键形，下缘三个控制点分别在左右端点贴合袖口。侧头±5°时四个下缘网格点的最大偏离37.72→6.84/6.88原图像素；中立最大差0.0000374像素，其余35网格在376姿态中保持。深色图确认空隙缩小，细缝和白边仍在，不能称为袖口完全完工。

保留此前眼睛视线校准、脸型、左侧底边修复、发束物理与头部侧倾。新增模型有36网格/36参数，MOC3为92864字节；7张纹理与v41一致。Core姿态、连续形变、1200帧原生物理及连续物理通过，无三角翻转、退化或非有限值。63项测试通过；真实适配器的视线、手部反馈、凤凰、三种空闲短动作运行链通过；CLI19资源无缺失，精简菜单浏览器检查通过。

Windows新EXE/NSIS构建退出0，实际启动看到透明桌宠、无专注/待办的菜单、原生桌宠设置与“Live2D已加载 / 制作中”。原生空闲位移未定量测量，本轮未重验跨应用计数、物理手柄、安装/卸载和多屏；浏览器通过不等于完整Windows验收。

运行包：`deliveries/20261006-v42-pet-0.5.13-candidate`。继续Cubism源：`tools/live2d-authoring/ChangliReferenceRepair-v42-candidate.cmo3`；源SHA256为4130424307504DE830B6E06CE7BD4B272A548EAE82EC6D108AC647B8A96B66DC。不要覆盖v39/v41或旧交付与恢复点。

剩余：袖口连接细缝与白边、右发饰遮罩锯齿、其他原图轮廓细边、凤凰正式原图美术、独立饰品物理、头部多角度和完整表情。下一步从v42另存新版本，首先精修袖口和右侧遮罩，不重复已经通过的视线、脸型、左侧底边或UI。

证据：`build/contour-audit-v42-20261006`、`build/reference-repair-v42-core-verification-20261006.json`；对照基线在v41，袖口调查在 `build/cuff-attachment-v41-20261006`。以上build路径均相对于 `tools/live2d-authoring`。

恢复：先读 `PROGRESS-CHECKPOINT-20261006.md` 和 `tools/live2d-authoring/build/desktop-integration-20261006/FULL-RECOVERY.json`，核对源/代码/资源SHA256。v39在上轮结束后再次保存的源与旧源二进制不同，但本轮重新导出的11个官方文件全部相同；两个源及核对报告都保留。

工具：CLI仅用于运行资源检查，原生网格与变形器仍在已安装的Cubism5.3中制作；不要重复下载或尝试已确认无法编写当前CMO3顶点的工具。独立变形器做法参考Live2D官方说明：https://docs.live2d.com/en/cubism-editor-manual/making-and-placement-of-warp-deformer/ 。GitHub调研见 `tools/live2d-authoring/TOOL-RESEARCH-20261006.md`。

'''
    for name,marker in [('README.md','## 快速运行'),('ENGINEERING_HANDOFF.md','## 以下为历史记录（不得覆盖用户最新范围）')]:
        p=ROOT/name;old=p.read_text(encoding='utf-8-sig');p.write_text(summary+old[old.index(marker):],encoding='utf-8')
    p=ROOT/'deliveries/20261006-v42-pet-0.5.13-candidate/README.md'
    text=p.read_text(encoding='utf-8').replace('三种空闲短动作、发束物理','三种空闲短动作、原生金饰收边与左袖口衔接、发束物理').replace('完整抠图轮廓、凤凰原图美术','剩余残白、袖口细缝、右侧遮罩、凤凰原图美术')
    p.write_text(text,encoding='utf-8')
    print('Updated v42 continuation and scoped acceptance')
