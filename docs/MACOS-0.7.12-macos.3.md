# 离火长明 0.7.12-macos.3 · macOS Apple Silicon 公测

这是独立的 **macOS ARM64** 发布，适用于 Apple Silicon Mac（M 系列），最低系统版本按应用配置为 macOS 12。Windows 用户请下载 [Windows 0.7.12](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.12)，本页附件不是 Windows 安装包，也不是 Intel Mac 安装包。

## 下载选择

- **推荐安装：** `changli-companion-0.7.12-macos.3-arm64.dmg`，打开后将应用放入“应用程序”。
- **APP 压缩包：** `changli-companion-0.7.12-macos.3-arm64.app.zip`，解压获得应用，与 DMG 二选一即可。
- **开发者源码：** `changli-companion-0.7.12-macos.3-source.zip`，不是可直接运行的应用。来自用户提供的 `ChangliCompanion.zip` 内真实 Git 提交；去除了 Git 工作区元数据、Finder 元数据和未跟踪文件，保留 Git 跟踪的源文件及脚本执行权限。
- `SHA256.json`：附件体积、SHA256、源码来源与验收范围。

## 版本内容与使用

提供 macOS 全局键鼠互动、鼠标视线跟随及登录后自动启动适配。首次使用全局键鼠互动，请在“系统设置 → 隐私与安全性 → 输入监控”中添加并允许“离火长明”，然后重新启动应用。需要登录后自动启动时，先安装到“应用程序”，再在桌宠“设置 → 高级”开启“开机启动”。

本次为 `macos.3` 构建编号；应用内部版本仍为 `0.7.12`。构建配置采用临时签名，不宣称经过 Apple 公证。

## 验收与来源

用户已于 **2026-10-12** 确认在 **MacBook 实测通过、运行正常**。具体芯片型号、macOS 小版本及逐项测试清单未提供，不扩展为所有 Mac 的兼容性保证。

归档端已核对 APP 的 ARM64 Mach-O 架构、应用版本、最低系统版本、ZIP 完整性和 SHA256；未在 Windows 上重复宣称完成 Mac 实机测试。

源码提交：`0bd8af98b4c6ab055447c792d01036d91d9fac95`；原标签：`macos-0.7.12-preview.3`。源码保留在独立 `macos-port` 分支，与 Windows 版本分开留档。

## 开发者入口

[macOS 源码分支](https://github.com/HABAI182/changli-companion/tree/macos-port)与主分支分别保留。下载本 Release 的 `source.zip` 后，需要 Node.js/npm、Rust/Cargo 和 Xcode Command Line Tools，在源码目录执行 `./macos/build.sh`。构建产物保存到源码目录之外。
