"""Publish current progress before making the recovery archive."""
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
header='''# 当前续接：2026-10-08，Windows 0.6.2 / 原生 Live2D v56

本版已交付并从交付目录实机运行，仍处于美术精修阶段。补齐左袖口透明三角缺口，八个实际桌宠姿态的指定原图不透明范围内露底像素均降至0。新背层 ArtMesh54 使用原图现有像素，Root、绘制顺序385；其余38个网格在529姿态下几何、UV、透明度和绘制顺序不变。耳饰连接层直线裁边仍待修，不能把局部补洞说成整图抠边完成。

65项测试、生产构建、真实SDK桌宠运行链和浏览器菜单设置通过。修正开发服务器冷启动时 public JSON 直接导入被拒绝的问题，两份配置通过编译模块读取，原JSON仍是唯一来源。Windows实机已观察透明显示、模型加载、摸头闭眼与恢复、菜单与设置、跨应用A/J计数0→1。安装卸载、物理输入设备、多DPI和完整美术尚未验收。

当前程序：deliveries/20261008-desktop-0.6.2/changli-companion.exe（30679040字节）；安装包22176780字节。哈希与交付说明见 SHA256.json、DELIVERY-0.6.2.md。当前模型入口 live-reference-repair-v56-candidate/ChangliReferenceRepairV56-physics.model3.json。

原生源：tools/live2d-authoring/ChangliReferenceRepair-v56-candidate.cmo3，SHA256 6AD7BF9A88C0836DAA7F94BFA709974084A9A5730FB82F3EACB3A686F92F75FD。官方MOC3 77760字节，SHA256 ECDC00A15ED367AB78FAA0E7752B89CB00666E0AA000C0B89B49318AF202341C。恢复快照、代码存档和完整恢复包见 build/LATEST-RECOVERY-20261006.json、build/desktop-integration-20261006/LATEST-RECOVERY.json、FULL-RECOVERY.json。每个阶段先保存可编辑源，再导出验证和存档。

下一步优先修原图分层裁边、耳饰/头颈/袖口衔接，再补主金饰独立变形、凤凰精细变形与扩展表情。已通过的桌面接入、局部补洞不重做。不要把5.4 Alpha MCP数据直接当5.3正式交付；自动化范围和限制见 AUTOMATION-STATUS-20261007.md。新导出走 finish_native_export.py；新增网格必须同步检查脚本的预期数量，不能放宽几何或物理阈值。

以下内容是历史阶段，当前入口与进度以上述记录为准。

'''
for name in ('ENGINEERING_HANDOFF.md','PROGRESS-CHECKPOINT-20261008.md'):
    destination=ROOT/name
    previous=destination.read_text(encoding='utf-8-sig') if destination.exists() else ''
    marker='以下内容是历史阶段，当前入口与进度以上述记录为准。'
    history=previous.split(marker,1)[1].lstrip() if marker in previous else previous
    destination.write_text(header+history,encoding='utf-8')
print('Current v56 / Windows 0.6.2 progress saved before archiving.')
