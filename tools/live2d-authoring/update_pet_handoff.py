"""Keep current scope and verification distinct from historical features."""
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
if __name__=='__main__':
    summary='''# 离火长明 — Q 版长离 Live2D Windows 桌宠

2026-10-06 当前工程为 **0.5.10 / Live2D v37 制作候选**。用户已明确要求只做桌宠，不需要专注、待办等多余功能：对应页面、菜单入口和计时结算效果已移除。历史数据不删除，领域兼容代码不再代表当前产品功能。

已完成本阶段：v32双眼中性位置/视线行程校准；v35左侧羽状底边缺角及白发交界；v36左上发饰和头顶四个轮廓点收边；v37右侧飘带原生Alpha遮罩。官方CMO3/MOC3均保留，模型未通过验证前不会覆盖旧恢复点。

灵动感：真实Live2D渲染层接入随机侧看、轻点头、歪头；参数平滑进入/退出，输入优先并回正。保留键鼠反馈、发束物理、点击互动、凤凰技术动作、拖动及桌宠设置。目标仍是用户原图造型和宇痕冫参考的动作/表情体验，不能声称最终风格已达标。

已验证：63测试；官方Core 376姿态、连续运动及物理；实际应用适配器动作/眼睛/凤凰与空闲动作链路；精简菜单浏览器检查；0.5.10 Windows EXE/NSIS构建退出0。原生窗口实际启动检查的范围见 `tools/live2d-authoring/build/desktop-0.5.10-ui-20261006/windows-verification-status.json`，不要把浏览器结果等同全部桌面验收。0.5.9原生诊断刷新已读到跨应用键鼠计数14/19/2/55，来自本机自动操作而非物理手柄测试。

未完成：少量白边和锯齿、凤凰正式原图美术、独立饰品精修、头部多角度和完整表情动作。尚未重新验收安装/卸载、物理手柄、多屏及全部桌面能力。本阶段交付为可运行制作候选。

工具：已安装 `cli-anything-live2d` skill，独立环境实际检查当前模型19个资源引用通过；它管理运行时文件，不能代替原生网格绑定。GitHub工具与开源桌宠参考见 `tools/live2d-authoring/TOOL-RESEARCH-20261006.md`。

续接入口：`PROGRESS-CHECKPOINT-20261006.md`；完整恢复包指针：`tools/live2d-authoring/build/desktop-integration-20261006/FULL-RECOVERY.json`。当前Cubism源为 `tools/live2d-authoring/ChangliReferenceRepair-v37-candidate.cmo3`。下一轮先核对文件SHA/进度，不重做已通过的UI、视线和物理。

'''
    p=ROOT/'README.md';old=p.read_text(encoding='utf-8-sig');tail=old[old.index('## 快速运行'):]
    tail=tail.replace('- 保留 25/45/60 分钟及 1–240 分钟自定义专注；开始、暂停、继续、取消、重启恢复、跨日记录、幂等结算。','- 历史专注领域逻辑仅为旧存档兼容保留；当前UI与计时结算效果已移除。')
    tail=tail.replace('- 保留今日待办新增、修改、完成、撤销、删除与今日要务；长内容在概览截断，列表展示全文。','- 历史待办数据兼容保留；当前产品不再显示待办页面和入口。')
    tail=tail.replace('设置和待办在独立可聚焦 WebView 窗口编辑','桌宠设置在独立可聚焦 WebView 窗口编辑')
    p.write_text(summary+tail,encoding='utf-8')
    p=ROOT/'ENGINEERING_HANDOFF.md';p.write_text(summary.replace('# 离火长明 — Q 版长离 Live2D Windows 桌宠','# 2026-10-06 当前桌宠续接状态')+'\n## 以下为历史记录（不得覆盖用户最新范围）\n\n'+p.read_text(encoding='utf-8-sig'),encoding='utf-8')
    print('Updated current pet scope, native/browser validation boundaries and recovery pointers')
