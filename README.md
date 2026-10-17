# 离火长明 · Q版长离 Live2D 桌宠

支持 Windows x64 与 macOS Apple Silicon，采用 Tauri、React、TypeScript 和 Live2D Cubism SDK。Windows 当前免费公测版 **0.7.16**，macOS **0.7.15-macos.1**，共用 v71 模型。

<img src="public/models/changli/preview.jpg" alt="长离桌宠预览" width="320" />

[B站主页](https://space.bilibili.com/1605091088) · [演示视频](https://www.bilibili.com/video/BV1Pipf6AEQF/) · [全部版本](https://github.com/HABAI182/changli-companion/releases)

## 下载与使用

| 系统 | 下载 |
| --- | --- |
| Windows x64 | [0.7.16 便携 EXE / 安装包](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.16) |
| macOS Apple Silicon，macOS 12+ | [0.7.15-macos.1 DMG / APP ZIP](https://github.com/HABAI182/changli-companion/releases/tag/macos-0.7.15-preview.1) |

下载前核对 Release 附件 SHA256。软件免费公测、未商业签名，详见[安全与隐私](SECURITY.md)和[运行许可](LICENSE-RUNTIME.txt)。macOS 版本来自 [Kyusakino 的适配](https://github.com/Kyusakino/changli-companion-macos)，安装与输入监控权限见 [macOS 说明](docs/MACOS-0.7.15-macos.1.md)。旧 Tag、Release 和下载附件分别保留。

右键角色打开互动菜单和设置；键盘右下角按钮用于拖动。实体键盘左右区分别驱动角色左右手，面对用户时画面镜像；空格由左手响应，右手空闲时响应鼠标。长按只弹动一次，松开回位。

- 17 种表情、3 段小动作、36 条互动气泡；凤凰、尾羽、头部与发饰动态。
- 单键或多键短暂浮显，最多 6 个；不保存输入文本和按键历史。
- 透明置顶、托盘、点击穿透与找回快捷键、全屏避让、边缘磁吸和常用位置。
- 50%–200% 大小、手速与动态幅度、主题及界面设置；可调鼠标静止后视线回正。
- 默认关闭的按键轻音，仅真实按下触发；高权限兼容启动仍需 Windows 确认。

## 开发

Windows 需要 Node.js、Rust、Microsoft C++ Build Tools / Windows SDK 和 WebView2。

```powershell
npm ci
npm run dev
npm run desktop
```

```powershell
npm run typecheck
npm test
npm run check:repository
npm run build
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm run package:windows
```

浏览器预览不包含全局输入、原生透明窗口、托盘与全屏避让。CI 检查结果见 [Actions](https://github.com/HABAI182/changli-companion/actions)。本轮维护只执行代码与构建检查，未重新验收安装器、游戏输入或 macOS。

当前模型入口为 `public/models/changli/live-reference-repair-v71-candidate/`。运行资源全部随源码保留；可编辑 CMO3 的私有保管和 SHA256 见 [authoring](authoring/README.md)。表情、轮廓与部分动态包含运行时补绘，不代表新的 CMO3/MOC3 导出；精细原生表情、完整抬臂和最终美术验收仍未全部完成。

素材来源见 [ASSETS.md](ASSETS.md)，代码、角色和 SDK 的许可分别见 [许可范围](LICENSE-SCOPE.md)与[第三方说明](THIRD-PARTY-NOTICES.md)。欢迎自愿[赞助开发](docs/sponsor/README.md)。维护发布时使用[发行检查表](docs/RELEASE-CHECKLIST.md)。
