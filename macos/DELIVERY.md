# macOS 本地交付 0.7.12-macos.1

日期：2026-10-12（Asia/Shanghai）。项目：离火长明。
上游源码提交：`37fce2ef573d52b60ebeb7b4d9d000f943581cbb`。
独立交付标识为 `0.7.12-macos.1`；应用内部保留上游版本 `0.7.12`。
目录：`deliveries/20261012-desktop-0.7.12-macos.1/`。

## 已验证

- 在 Apple Silicon、macOS 26.5.1 上构建 ARM64 Mach-O 应用和 DMG。
- `npm run build` 的 TypeScript 检查和 Vite 发行构建成功。
- 19 个前端测试文件、86 个测试通过。
- `./macos/test.sh` 的 11 个 Rust 测试通过。
- 发行目录中当前 Live2D 模型的 38 个文件引用均存在。
- 本机启动应用，原生窗口展示 Cubism 长离模型；点击摸头后出现“轻一点，发饰会乱”气泡。
- 应用使用 ad-hoc 签名，`codesign --verify --deep --strict` 通过。
- `hdiutil verify` 检查 DMG 通过。
- CLI 自动改写 Cargo.toml 后，脚本恢复原内容；上游源码与配置文件无持久改动。

## 可复现方式

`./macos/build.sh` 构建 app/dmg，`./macos/test.sh` 运行原生测试。
首次原生测试未启用与 Tauri 发行构建一致的 custom-protocol，出现重复嵌入 Info.plist；
测试入口已通过构建配置解决，无需修改 Rust 源码。
重新打包 DMG 的一次运行失败，重试打包成功，最终镜像校验通过。
具体环境和功能限制见 README.md。

## 验收边界

未完成 Intel、Universal、旧版 macOS、多屏/DPI、完整拖动和菜单、全局快捷键、
开机自启与长期运行验收。窗口按上游配置设置透明置顶；未单独测量透明像素和窗口层级。
全局键鼠输入、鼠标视线跟随、XInput 手柄及外部全屏自动隐藏只有 Windows 实现。
设置中的项目链接使用 explorer.exe，在 macOS 仍不可用。
普通 macOS 桌面 dev 编译存在上游双 generate_context! 的 Info.plist 冲突；
前端可通过 npm run dev 开发，桌面可通过发行构建复验。
本地签名不含 Apple Developer ID 或公证。没有向上游发布 Release 或推送提交。

源码快照只包含仓库源文件与本次独立 macOS 配置，不含本机数据、日志或依赖缓存。
Live2D 运行资源沿用上游 v71，没有重新导出 MOC3/CMO3。
