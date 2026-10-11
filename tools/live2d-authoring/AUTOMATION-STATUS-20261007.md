# Live2D 自动化现状与高效继续方式

目标仍是长离 Windows Live2D 桌宠；本记录不是正式美术完工证明。

## 已经实际使用

- `cli-anything-live2d` 已安装在 `build/live2d-cli-venv/Scripts/`。当前 v55 的 inspect、validate、lint 已运行，19 个引用资源完整、无资源/格式错误。文件命名警告把标准 `.model3`/`.motion3` 后缀当成特殊字符，不改成非标准后缀来迎合它。
- Cubism 5.3.04 原生编辑与官方 MOC3 导出仍负责可编辑 `.cmo3`、网格、关键形和物理。CLI 不能代替原生建模。
- 新增 `finish_native_export.py`：等待官方导出文件稳定 → 原样暂存资源 → CLI 检查 → 官方 Core 姿态/物理回归 → 美术截图 → 保存校验过的原生恢复点。任一阶段失败即停止，不会沿用旧报告宣称通过。

```powershell
# 先在 Cubism 保存同版本源模型，并导出到该版本的 editor-export 目录。
D:/python/python.exe tools/live2d-authoring/finish_native_export.py --version 55 --date 20261006
```

不要重复运行已经通过的旧版本，也不要恢复清理掉的历史文件。需要改 v55 时先另存新版本，避免覆盖已验证源模型和导出。

## MCP 调查结论

插件目录搜索 Live2D/Cubism 未返回可安装匹配项；这不代表所有外部 MCP 都不存在。

[CubismExternalEditMCP](https://github.com/nana7chi/CubismExternalEditMCP/blob/master/i18n/README_EN.md) 有 42 个工具，支持事务、结构查询、参数/部件/变形器/ArtMesh 编辑。原生结构编辑要求 Cubism 5.4 Alpha；本机 5.3.04 不具备对应编辑 API，当前未安装、未连通，不宣称已经自动操控源模型。

[官方 5.4 Alpha 公告](https://www.live2d.com/en/information/cubism-5_4-alpha/) 当前明确 alpha2 延期至 2026-10-18；README 所写 2026-09-14 是旧 alpha1 的期限。官方还说明 Alpha 数据兼容性不保证并请勿销售/分发。因此不能为了短期 MCP 便利，把正式交付直接迁移为 Alpha 模型。若之后用于独立试验，保留 5.3 源工程及官方导出，使用单独副本；应用集成授权须由用户完成。

[autoLive2d](https://github.com/KonshinHaoshin/autoLive2d/blob/main/README.md) 主要是 PSD → runtime，依赖 Cubism 5.1 JAR/DLL。没有验证能完整保留本工程已有 5.3 原生关键形、物理和可编辑源文件；未复制其大型依赖或用它替换当前工程。

[live2d-automation](https://github.com/J621111/live2d-automation) 的 mock/GUI 调度与真正原生编辑能力需要区分；没有因为提供 MCP 名称就把中间文件当正式模型。

当前提效采用“原生只做必要编辑，资源和回归全部命令化”，而非重新拆模型或重做已经通过的功能。

## 本轮已保存的工作

- 原生 v55：脸部干净底色顺序由 490 改为 496，盖过旧下脸图层 495，去除闭眼左眼下方残线；其他网格的形状、UV、透明度及顺序保持不变，529 组姿态检查通过。
- Desktop 0.6.1：摸头短暂开心闭眼再恢复；手动表情保留优先级，选择默认表情会释放手动覆盖。
- 正式打包仅复制当前模型及实际运行依赖，保留工作区的对照模型供 QA，不再把所有候选模型塞进 EXE。

仍需完成扩展表情、独立主金饰、凤凰细腻羽毛变形和大角度接缝终验。浏览器 QA、原生桌宠运行、安装/卸载与硬件输入分别记录。
