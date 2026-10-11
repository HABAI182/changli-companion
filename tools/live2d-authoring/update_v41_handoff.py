"""Describe only the exported, checked and natively observed v41 candidate."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

if __name__ == '__main__':
    summary = '''# 离火长明 — Q 版长离 Live2D Windows 桌宠

2026-10-06 当前为 **0.5.12 / Live2D v41 制作候选**。产品保留桌宠互动和设置，专注/待办已移除；历史数据保留。风格和动作目标仍为用户给出的原图与宇痕冫参考，尚未达到最终体验。

新增：Cubism 原生 ArtMesh38 的 v40 四点与 v41 一点收边，清理左上金饰外侧白片。深色背景三个指定局部区域亮白像素为61→8、11→0、9→2；金色高光和深色描边仍在。首次v40五点预期失败报告保留：顶点13的一屏像素拖动没有生效，v41另存工程后实际改动4原图像素。没有修改纹理底绘，也没有把少量残白称为彻底清理。

已有视线、脸型、左侧底边、发束物理和原生±5°侧倾保留。36网格/36参数：v40、v41官方Core逐版本376姿态检查其他35网格一致，无翻转、退化、非有限值；1200帧物理及连续运行通过。CLI19个资源引用无缺失。63项测试通过，实际浏览器Core适配器的视线、手部、凤凰与三种空闲动作运行链通过；菜单检查通过。

Windows：新EXE与NSIS构建退出0，实际启动看到透明桌宠、无专注/待办的互动菜单、原生“桌宠设置”和“Live2D已加载 / 制作中”。原生空闲位移未做定量测量，本轮未重验跨应用输入计数、物理手柄、安装/卸载和多屏，不能将浏览器验证当作完整Windows验收。

未完成：剩余细白边、右发饰遮罩锯齿、大幅侧倾的左袖口空隙、凤凰正式原图美术、独立饰品物理、头部多角度、完整表情。深色极限侧头证据在 `tools/live2d-authoring/build/contour-audit-v41-20261006`，左袖口空隙需原生衔接制作，不能只缩小动作后声称完成。

运行包：`deliveries/20261006-v41-pet-0.5.12-candidate`。继续Cubism源：`tools/live2d-authoring/ChangliReferenceRepair-v41-candidate.cmo3`，SHA256 B00D5475F1AF402AD90102E2C88721095B94D449D39CA7990403FDCDCD0ACE76。v39在上一轮之后另存的源与旧源二进制不同，但本轮未编辑重新导出的11个官方文件全部相同，证据 `build/v39-observed-source-comparison-20261006.json`；两个源都保留，不覆盖旧恢复点。

恢复时先读 `PROGRESS-CHECKPOINT-20261006.md` 和 `tools/live2d-authoring/build/desktop-integration-20261006/FULL-RECOVERY.json`，核对源、代码与资源SHA256。不要重做已通过的眼睛、脸型、左侧底边或UI，不覆盖旧候选交付和恢复包。

工具：已安装CLI仅用于运行资源检查，原生网格仍在Cubism制作。GitHub工具与开源桌宠调研见 `tools/live2d-authoring/TOOL-RESEARCH-20261006.md`；不要重复尝试已确认无法编写当前CMO3顶点的API工具。

'''
    for name, marker in [('README.md', '## 快速运行'), ('ENGINEERING_HANDOFF.md', '## 以下为历史记录（不得覆盖用户最新范围）')]:
        path = ROOT / name
        old = path.read_text(encoding='utf-8-sig')
        path.write_text(summary + old[old.index(marker):], encoding='utf-8')
    path = ROOT / 'deliveries/20261006-v41-pet-0.5.12-candidate/README.md'
    old = path.read_text(encoding='utf-8')
    old = old.replace('三种空闲短动作、发束物理', '三种空闲短动作、v40/v41金饰外缘原生收边、发束物理')
    old = old.replace('完整抠图轮廓、凤凰原图美术', '残白细边、右发饰遮罩、大幅侧倾袖口空隙、凤凰原图美术')
    path.write_text(old, encoding='utf-8')
    print('Updated v41 continuation; native visibility observed, formal art incomplete')
