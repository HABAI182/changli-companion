"""Write the current continuation state while retaining historical requirements."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

if __name__ == '__main__':
    summary = '''# 离火长明 — Q版长离 Live2D Windows 桌宠

2026-10-06 当前为 **0.5.14 / Live2D v44 制作候选**。目标仍是忠实原图的正式 Live2D 桌宠与接近宇痕冫的灵动体验。专注、待办入口已移除，旧数据保留。正式美术与全部 Windows 验收尚未完成。

本轮继续原生袖口关键形精修，没有重做已经通过的视线、脸型、左侧底边或菜单。Cubism 中保留 `LeftCuffAttachment / Warp13`，仅控制 ArtMesh33。v43第一次导出的负侧最大偏移3.3589像素，未达原定3像素标准；该源、导出和失败报告保留。另存v44后微调负侧关键形，四个下缘锚点在侧倾±5°的最大偏离由v42的6.8419/6.8849降为1.9341/2.4562原图像素。中立几何差为0，其余35网格在376姿态中保持；UV、索引、纹理和遮罩拓扑未改。此指标只验证指定连接点，不代表袖口全部轮廓或整套美术完工。

真实Core姿态、连续形变、1200帧原生发束物理与连续物理通过，无三角翻转、退化或非有限值。63项测试通过；实际适配器的视线、手部反馈、凤凰和三种空闲短动作运行链通过。CLI核对19资源无缺失，浏览器精简菜单通过。

Windows新EXE/NSIS构建退出0；实际启动看到了透明角色、精简菜单、桌宠设置及“Live2D已加载 / 制作中”。本轮没有定量测量原生窗口空闲动作，也没有重验跨应用输入计数、物理手柄、安装/卸载或多屏。不能把浏览器/Core通过称为完整Windows验收。

运行包：`deliveries/20261006-v44-pet-0.5.14-candidate`。可编辑工程：`tools/live2d-authoring/ChangliReferenceRepair-v44-candidate.cmo3`，SHA256 F97CEE717B065D0FF2D67A9B899D080D09A0AD1042D191AF2842BC9DA6FE21CE。保留v42已验证基线和全部旧交付，不覆盖恢复点。

剩余：右侧饰品遮罩白色锯齿、其他轮廓残白与袖口细边、凤凰正式原图美术及尾羽、独立饰品物理、头部多角度和完整表情动作。深色导出图确认这些仍可见。下一轮从v44另存新版本，优先处理右侧遮罩；其凹曲线需精确分割/遮罩，不能整体缩边抹掉原图黑色描边。

本轮还修正了只读袖口调查工具：旧meshGeometry会先重置中立，导致v41调查图不同文件名实际相同。现已显式传入姿态，v41/v42/v43/v44调查重新生成；旧JSON保留作错误证据。正式Core验收和暗底轮廓审查使用独立路径，不受该调查工具问题影响。

证据：`tools/live2d-authoring/build/reference-repair-v44-core-verification-20261006.json`、`build/contour-audit-v44-20261006`、`build/cuff-attachment-v44-20261006`、`build/desktop-v44-integration-20261006/runtime-chain.json`。以上简写build路径相对于tools/live2d-authoring。

恢复时先读 `PROGRESS-CHECKPOINT-20261006.md` 与 `tools/live2d-authoring/build/desktop-integration-20261006/FULL-RECOVERY.json`，核对工程、代码、资源SHA256。工作区无Git仓库或AGENTS.md，以恢复清单和时间戳续接。

CLI仅检查运行资源；当前网格/变形器通过本机Cubism5.3原生编辑。工具调研见 `tools/live2d-authoring/TOOL-RESEARCH-20261006.md`，不要重复已确认不能编辑当前CMO3顶点的工具路线。

'''
    for name, marker in [('README.md', '## 快速运行'), ('ENGINEERING_HANDOFF.md', '## 以下为历史记录（不得覆盖用户最新范围）')]:
        path = ROOT / name
        old = path.read_text(encoding='utf-8-sig')
        path.write_text(summary + old[old.index(marker):], encoding='utf-8')
    path = ROOT / 'deliveries/20261006-v44-pet-0.5.14-candidate/README.md'
    path.write_text(path.read_text(encoding='utf-8').replace('完整抠图轮廓、凤凰原图美术', '右饰品遮罩残白、其他轮廓细边、凤凰原图美术'), encoding='utf-8')
    print('Updated current v44 state; historical releases retained')
