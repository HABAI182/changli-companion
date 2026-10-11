# Live2D 制作工具与桌宠参考核查

用户要求：去掉专注、待办等多余功能；提高角色的灵动感；精修左侧羽状底边与抠图残留；参考宇痕冫的互动表现。外部文档是技术参考，不改变这个目标。

## 已安装并实际使用

- [HKUDS/CLI-Anything Live2D](https://github.com/HKUDS/CLI-Anything/tree/main/live2d/agent-harness)，固定提交 `34f519533bc175d2fe287ab8316b0dd99bb9cc43`。
- skill 安装在 `C:/Users/18769/.codex/skills/cli-anything-live2d/SKILL.md`，下一轮可自动发现。
- 独立环境命令：`tools/live2d-authoring/build/live2d-cli-venv/Scripts/cli-anything-live2d.exe`。在当前 v35 实际执行 `--json validate ... --strict` 与 `--json inspect ...`，检查19个资源引用通过：7张纹理、5个动作、4个表情、物理配置均存在。
- 此工具编辑的是运行时 JSON/资源引用，MOC3检查只读取头部，**不是完整 Core 验证，更不能代替可编辑原生绑定或网格轮廓精修**。原生工程继续由 Cubism 保存、正式导出与 Core 验证。

## Cubism 外部接口工具

[nana7chi/CubismExternalEditMCP](https://github.com/nana7chi/CubismExternalEditMCP) 支持参数读写和5.4 Alpha的编辑事务。已读取源码与 skill 作为参考，尚未安装/启用MCP。当前5.3.04仅支持较早的参数接口，本机22033未监听；新接口的 EditArtMesh 主要编辑属性/父对象/遮罩等，不包含网格顶点坐标编辑。不能宣称它已经能完成本项目的抠图。

官方新接口资料：[External API](https://cubism.live2d.com/editor-alpha/doc/manual/alpha1/en/external-api-intergration/index.html)。5.4 Alpha项目兼容性与有效期不同，不能直接替换当前通过验证的5.3工程。

CLI源代码下载清单见 `references/tool-research-20261006/cli-download-manifest.json`。它保留固定提交以便恢复工具；独立环境不纳入恢复包，可从该源码重新安装。

## 桌宠源代码参考

- [gameswu/NyaDeskPet](https://github.com/gameswu/NyaDeskPet)，固定提交 `a402fcded592a35dc2e9bda0788e52d7348ddb5e`。已读取 `renderer/js/live2d-manager.ts` 中的视线平滑与模型部位触摸分发；只参考交互设计，没有复制其AI/聊天模块或角色资产。
- [One1turn/Live2D-DesktopPet](https://github.com/One1turn/Live2D-DesktopPet)：Electron/PIXI运行时参考，保持当前已经工作的Tauri实现。
- `ttq7/Live2D-Desktop-Pet` 当前仓库树缺少应用源代码，仅能参考说明；不运行来历不明的预编译程序。
- `Ariakage/live2d-agent-kit` 可参考保留原图像素、源图位置和验证清单，但其psd2live路线不能自动补全当前原生可编辑工程。

## 本阶段落实

删除专注/待办页面及菜单入口，旧存档保留不破坏。真实 Live2D Adapter 接收空闲侧看、轻点头、歪头的平滑参数；输入优先并平滑回正。官方Core实测头部最大位移约2.03/2.70/7.44原图像素，三种动作单帧位移均小于0.4像素，手部固定且回正残差0。尚不足以宣称达到宇痕冫作品的最终风格与演出水平。

深色背景复查发现左上发饰外缘、右侧飘带内侧白块，仍需清理。左侧羽状底边缺角/白发衔接修复已导出v35并验证，不重做。
