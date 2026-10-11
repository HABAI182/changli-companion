"""Record the observed v39 stage without repeating historical handoffs."""
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
if __name__=='__main__':
    status=HERE/'build/desktop-0.5.11-ui-20261006/windows-verification-status.json'
    doc=json.loads(status.read_text(encoding='utf-8'))
    doc['crossApplicationInputCountersVerified']=True
    doc['crossApplicationCounters']={'left':1,'right':3,'special':0,'mouse':2}
    doc['crossApplicationInputScope']='Sky-generated A/J/Escape and clicks while Cubism was foreground; counts observed only after refreshing native diagnostics. This is not physical keyboard/gamepad acceptance.'
    status.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    summary='''# 离火长明 — Q 版长离 Live2D Windows 桌宠

2026-10-06 当前工程为 **0.5.11 / Live2D v39 制作候选**。产品只保留桌宠互动与设置；专注/待办入口、页面和计时结算效果已移除，历史存档保留。

本轮新增：v38 在 Cubism 中收紧 ArtMesh38 左发饰旁四个原图边界点，指定残白区域由115像素降至0；v39 将 WholePose 原生左右侧倾关键形从±2°增强至±5°。中立36网格完全保持；六个双手/键盘/凤凰网格固定。保留此前视线校准、左侧羽状底边、头顶和右侧飘带修正。

已验证：本轮63项测试、类型检查和Windows EXE/NSIS构建退出0；官方Core 376姿态、连续形变及原生物理通过；CLI检查19个资源引用无缺失；精简菜单浏览器检查通过。真实适配器三种空闲动作的头部位移为5.07/6.76/18.59原图像素，平滑结束归零，双手固定。Windows实际启动看到透明桌宠、精简菜单及“Live2D已加载”；刷新诊断后跨Cubism输入计数为左1/右3/特殊0/鼠标2，来自工具输入，不等同物理手柄验收。原生内部逐帧位移没有测量。

未完成：金饰细边和右发饰少量锯齿、极端侧倾袖口衔接、凤凰正式原图美术、独立饰品物理、头部多角度及完整表情。不能声称已达到宇痕冫参考的最终体验。安装/卸载、多屏和物理手柄尚未重新验收。

运行包：`deliveries/20261006-v39-pet-0.5.11-candidate`，EXE与安装包均有SHA256。Cubism继续源为 `tools/live2d-authoring/ChangliReferenceRepair-v39-candidate.cmo3`；已核验源SHA256为76CF3A8B830854C9C160FED09B9EB731500A115ECEC84503C37041B73EE4D5CA。

恢复：先读 `PROGRESS-CHECKPOINT-20261006.md` 和 `tools/live2d-authoring/build/desktop-integration-20261006/FULL-RECOVERY.json`，核对最新恢复包及源SHA。不要重新导入原图或重做已通过的视线、UI和物理。模型/源/代码/工具参考都保存，旧恢复点不覆盖。

工具：已安装的 `cli-anything-live2d` 负责运行文件检查；正确JSON命令形式是 `cli-anything-live2d --json validate <model>`。它不能编写原生网格或CMO3。原生修改仍通过已安装Cubism完成；GitHub调研见 `tools/live2d-authoring/TOOL-RESEARCH-20261006.md`，不重复下载和试用已判定不合适的工具。

'''
    path=ROOT/'README.md'
    old=path.read_text(encoding='utf-8-sig')
    path.write_text(summary+old[old.index('## 快速运行'):],encoding='utf-8')
    path=ROOT/'ENGINEERING_HANDOFF.md'
    old=path.read_text(encoding='utf-8-sig')
    marker='## 以下为历史记录（不得覆盖用户最新范围）'
    path.write_text(summary.replace('# 离火长明 — Q 版长离 Live2D Windows 桌宠','# 2026-10-06 当前桌宠续接状态')+old[old.index(marker):],encoding='utf-8')
    delivery=ROOT/'deliveries/20261006-v39-pet-0.5.11-candidate/README.md'
    text=delivery.read_text(encoding='utf-8')
    text=text.replace('三种空闲短动作、发束物理','三种空闲短动作、v38左侧残白清理、v39原生侧倾幅度增强、发束物理')
    text=text.replace('完整抠图轮廓、凤凰原图美术','金饰细边和右侧锯齿、极端侧倾袖口衔接、凤凰原图美术')
    text=text.replace('三种空闲动作已由 Core 验证','刷新原生诊断确认跨Cubism输入计数左1/右3/特殊0/鼠标2（工具输入）。三种空闲动作已由 Core 验证')
    delivery.write_text(text,encoding='utf-8')
    print('Updated v39 continuation and native input evidence; formal artwork remains incomplete')
