# 第三方与角色素材说明

本项目没有复用 BongoCat 源码或宇痕模型，仅阅读工程/展示说明以确定功能边界。没有下载或复制参考作者的模型、付费资产、语音或 Live2D 工程。长离及《鸣潮》相关权利归相关权利人，程序依赖许可不授予角色 IP 或素材公开发行许可。用户于2026-10-12声明原图及衍生视觉素材均由其生成，未引用他人素材；这是用户来源声明，不代替角色IP授权。

## 直接依赖

依赖版本在 npm 注册表/crates.io 与官方文档核对，项目使用精确版本；完整解析结果见 package-lock.json 与 Cargo.lock。

| 包                              | 版本    | 许可              |
| ------------------------------- | ------- | ----------------- |
| react / react-dom               | 19.3.0  | MIT               |
| @tauri-apps/api                 | 2.11.1  | Apache-2.0 OR MIT |
| @tauri-apps/cli                 | 2.11.5  | Apache-2.0 OR MIT |
| vite                            | 8.3.0   | MIT               |
| @vitejs/plugin-react            | 6.1.1   | MIT               |
| typescript                      | 5.9.3   | Apache-2.0        |
| vitest                          | 5.0.1   | MIT               |
| prettier                        | 3.9.9   | MIT               |
| @types/react / @types/react-dom | 19.3.0  | MIT               |
| @types/node                     | 26.6.2  | MIT               |
| tauri                           | 2.11.6  | Apache-2.0 OR MIT |
| tauri-build                     | 2.6.3   | Apache-2.0 OR MIT |
| tauri-plugin-autostart          | 2.5.1   | Apache-2.0 OR MIT |
| tauri-plugin-global-shortcut    | 2.3.2   | Apache-2.0 OR MIT |
| serde                           | 1.0.229 | MIT OR Apache-2.0 |
| serde_json                      | 1.0.151 | MIT OR Apache-2.0 |
| rusqlite                        | 0.40.2  | MIT               |
| windows-sys                     | 0.61.2  | MIT OR Apache-2.0 |

SQLite 随 rusqlite bundled 构建；WebView2 是 Windows 运行时前提，没有把它的二进制捆绑到当前源码交付中。项目现已在用户授权下引入官方 **Live2D Cubism SDK for Web R5** 的 Framework 源码、WebGL shaders 和 Core `live2dcubismcore.min.js`。Framework 使用 [Live2D Open Software License](https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html)，Core 使用 [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html)。本地许可副本见 `vendor/live2d/FRAMEWORK-LICENSE.md`、`vendor/live2d/CORE-LICENSE.md`，Core 可再分发文件范围见 `vendor/live2d/CORE-REDISTRIBUTABLE-FILES.txt`。官方示例模型受单独的 Free Material License 和各模型条款约束，本工程没有包含它们。0.7.10随发行附件提供LICENSE-RUNTIME.txt和THIRD-PARTY-LICENSES.txt；后者收集本机依赖源包中的许可文件与元数据，并明确列出没有独立许可文件的包。Core许可和版权未被本项目MIT许可替换。当前为免费公测，后续重新分发仍须遵守SDK协议。

候选模型的离线生成脚本内置了 [enoughdrama/live2d-autorig-claude](https://github.com/enoughdrama/live2d-autorig-claude) 的部分实验性源码，按 MIT 许可使用；许可副本位于 `tools/live2d-authoring/vendor/LICENSE`。该脚本仅在制作阶段运行，未作为桌宠运行时代码加载。

## 实施参考

2026-10-06 制作工具：`HKUDS/CLI-Anything` 的 Live2D CLI 0.3.0（MIT），固定提交 `34f519533bc175d2fe287ab8316b0dd99bb9cc43`，只在独立制作环境运行，不加载到桌宠。源码与许可见 `tools/live2d-authoring/references/tool-research-20261006/`。NyaDeskPet 与 CubismExternalEditMCP 源码在同目录仅作技术参考，各自许可副本一并保留；没有复制其角色资产或应用模块进桌宠运行时。

- [Tauri 环境要求](https://v2.tauri.app/start/prerequisites/)
- [Tauri 系统托盘](https://v2.tauri.app/learn/system-tray/)
- [Tauri 全局快捷键](https://v2.tauri.app/plugin/global-shortcut/)
- [Tauri 开机启动](https://v2.tauri.app/plugin/autostart/)
- [Win32 LowLevelKeyboardProc](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc)
- [Vite](https://vite.dev/guide/) / [Vitest](https://vitest.dev/guide/) / [React](https://react.dev/learn/setup)

艺术参考来源及生成提示词见 ASSETS.md。官方参考与用户图不会被描述为已经授予软件发布授权。
