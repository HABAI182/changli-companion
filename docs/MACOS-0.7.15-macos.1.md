# 离火长明 0.7.15-macos.1 · macOS Apple Silicon 公测

本版将 [Kyusakino 的 macOS 0.7.15 适配发布](https://github.com/Kyusakino/changli-companion-macos/releases/tag/macos-0.7.15-preview.1)并入本项目的 macOS 发行渠道，保留贡献者、真实源码提交及原始附件。感谢 Kyusakino 的适配工作。

**适用设备：Apple Silicon Mac（M 系列），macOS 12 或更新版本。**

下载：[macOS 0.7.15-macos.1](https://github.com/HABAI182/changli-companion/releases/tag/macos-0.7.15-preview.1)。Windows 请使用独立的 [Windows 0.7.15](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.15)。

## 下载与安装

- `changli-companion-0.7.15-macos.1-arm64.dmg`：打开后将“离火长明”拖入“应用程序”
- `changli-companion-0.7.15-macos.1-arm64.app.zip`：解压获得应用，与 DMG 二选一即可
- `SHA256.json` / `SHA256SUMS.txt`：原始安装附件的体积与 SHA256 校验值
- Release 自动提供的 Source code ZIP / TAR.GZ：本版真实源码，供开发者使用

DMG、APP ZIP 和两份校验文件均保持上游原文件内容与文件名。应用使用本地临时签名，未进行 Apple 公证；不提供 Intel Mac 构建。

## 本版功能

- 双手分别响应键盘左右分区，并区分前后落点；长按保持落键，松开回位
- 按键浮显、长按重复浮显开关，显示上限可调 1～6 个，默认 1 个
- 全局键鼠互动、鼠标视线跟随、更新的键盘与鼠标素材
- 桌宠大小和设置文字大小调节，以及加载完成后的首帧显示
- 登录后自动启动、同屏全屏避让和应用例外

本版不包含 macOS 手柄互动。Windows 高权限启动属于 Windows 功能，Mac 使用系统的输入监控授权。

## 输入监控与更新后的授权

首次使用请打开“系统设置 → 隐私与安全性 → 输入监控”，允许已安装的“离火长明”，然后重新启动应用。

更新后如果键盘或鼠标不响应，请检查这里的授权。必要时移除旧条目，再重新添加“应用程序”中的新版应用，随后重启桌宠。

## 其他设置

“设置 → 桌面”提供全屏自动避让。应用例外可以填写 `Safari.app` 或 `com.apple.Safari` 一类应用名称或标识。

将应用安装到“应用程序”后，可在“设置 → 高级”开启登录自启动。

## 源码与版本留档

- 上游仓库：[Kyusakino/changli-companion-macos](https://github.com/Kyusakino/changli-companion-macos)
- 本版源码提交：`eaa0185229654f81ba0e51621a17685d4c658c6a`
- 本仓库标签：`macos-0.7.15-preview.1`，指向同一提交
- 源码分支：[macos-port](https://github.com/HABAI182/changli-companion/tree/macos-port)
- 本地独立归档：`deliveries/20261014-desktop-0.7.15-macos.1/`

macOS 源码已经通过 [PR #1](https://github.com/HABAI182/changli-companion/pull/1) 合入 `macos-port`，本次沿用现有合并结果，保留原有提交和贡献者记录。Windows 主分支仅更新下载与归档说明。旧 Mac 0.7.12-macos.3 与 Windows 0.7.15 的发布附件和标签继续保留。

本次归档已核对四个附件与上游的 SHA256、两份校验文件、APP ZIP 完整性、应用版本、ARM64 Mach-O 架构和最低系统版本。当前工作环境是 Windows，没有将这些文件检查标为新版本的 Mac 实机验收，也未验证 Apple 签名或公证状态。

源码构建方式见 macOS 分支 README 与 `macos/build.sh`；本次直接收录上游已经发布的构建，不重新编译安装包。
