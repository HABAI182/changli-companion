# macOS 构建（保留上游源码）

基于上游 0.7.12，提交 `37fce2ef573d52b60ebeb7b4d9d000f943581cbb`。
本目录提供独立 Tauri 配置和构建入口，不修改前端、Rust 业务代码、模型或依赖版本。

## 构建与开发

在项目根目录执行：

```bash
./macos/build.sh
./macos/test.sh
```

需要 macOS、Xcode Command Line Tools、Rust/Cargo 和 Node.js/npm。
首次运行自动执行 `npm ci`；缓存放在 `.macos-cache/npm`，避免现有 npm 缓存权限问题。
如果当前网络需要本机已配置的代理，可按实际地址设置：

```bash
HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
CARGO_HTTP_PROXY=http://127.0.0.1:7892 \
npm_config_proxy=http://127.0.0.1:7892 ./macos/build.sh
```

产物在 `src-tauri/target/release/bundle/macos/`（应用）和
`src-tauri/target/release/bundle/dmg/`（安装镜像）。默认编译当前机器架构。
本次机器是 Apple Silicon；Intel/Universal 未验证。
配置的最低系统版本为 macOS 12，但不代表已在 macOS 12 完成验收。

Tauri 2.11.6 的透明窗口需要 `app.macOSPrivateApi` 和
`tauri/macos-private-api`。CLI 会自动改写 Cargo.toml 的功能列表，
`run.sh` 会保存调用前的文件并在正常退出、报错、INT 或 TERM 时恢复原内容。
无法拦截 SIGKILL；若被强制终止，原文件保存在 `.macos-cache/tauri-lock/Cargo.toml`。
构建期间不要同时编辑 Cargo.toml；脚本用锁阻止自身并发。
基础 `tauri.conf.json` 的 Windows NSIS 设置由独立配置覆盖为 app/dmg。

## 功能范围

这是尽量不改源码的 macOS 构建，不宣称 Windows 功能全部完成移植：

| 功能 | 源码情况 |
| --- | --- |
| Live2D / WebGL、透明置顶窗口、设置、本地 SQLite 存储、窗口位置 | 使用跨平台 Tauri 和前端实现；实测范围见 DELIVERY.md |
| 表情全局快捷键 | 原项目使用跨平台 global-shortcut 插件；具体组合需实机验证 |
| 全局键盘和鼠标输入、鼠标视线跟随 | 原实现只在 Windows 编译；macOS 不启动监听 |
| 手柄输入 | 仅 Windows XInput；macOS 未实现 |
| 外部全屏应用自动隐藏 | 非 Windows 分支固定返回 false |
| 设置页“项目主页/更新” | 原代码调用 explorer.exe，在 macOS 会报错；可手动访问原仓库 |

如果需要这些 Windows 专用功能，必须增加 macOS 适配代码或独立补丁。
当前安装包供本机验证，使用本地 ad-hoc 签名，未配置 Apple Developer ID 签名和公证；分发准备需另行完成。

原项目的两个 `generate_context!()` 在 macOS 的普通 dev 模式下会重复嵌入
Info.plist，因此暂不提供桌面 dev 脚本。前端开发可使用 `npm run dev`。
`test.sh` 使用与发行构建相同的 custom-protocol 功能运行 Rust 测试，避免这项冲突。

Tauri 配置参考：https://v2.tauri.app/reference/config/#macosprivateapi
