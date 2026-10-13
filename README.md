# 离火长明 · Q版长离 Live2D 桌宠

支持 Windows x64 与 macOS Apple Silicon 的桌面伴侣。Windows 当前免费公测版 **0.7.15**，macOS 当前源码适配版 **0.7.15-macos.1**，共用原生模型 v71。采用 Tauri、React、TypeScript 与 Live2D Cubism SDK。

<img src="public/models/changli/preview.jpg" alt="长离桌宠预览" width="320" />

[B站主页](https://space.bilibili.com/1605091088) · [桌宠演示视频](https://www.bilibili.com/video/BV1Pipf6AEQF/)

0.7.15 提供 Windows 高权限游戏输入兼容，默认开启高权限兼容启动，可在桌面设置关闭；启动需 Windows 确认。长按时按下弹动一次，随后保持落键，松开后回位。长按默认只浮现一次按键，可在互动设置开启重复浮现；同时浮现上限可调 1～6 个，默认 1 个。

## 公测说明

新版采用圆角长离图标、精简设置标题与立体键帽；右键菜单独立显示在桌宠旁边。按键浮现默认开启，保存过的偏好不会被强制修改。

软件免费公测，未商业签名；下载安装前请核对Release附带的SHA256.json，另见[安全与隐私说明](SECURITY.md)和[许可说明](LICENSE-RUNTIME.txt)。新版本和历史版本分别留档。

## 使用

按系统获取程序，安装后无需开发服务器：

| 系统 | 当前版本与获取方式 | 文件类型 |
| --- | --- | --- |
| Windows x64 | [Windows 0.7.15](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.15) | 便携 EXE / EXE 安装包 |
| macOS Apple Silicon（M 系列） | 0.7.15-macos.1 · [源码编译](#macos-编译与使用) | APP / DMG（编译生成）；最低 macOS 12 |

右键角色打开互动菜单和设置；拖动键位于键盘右下角。历史版本分别留档，见文末版本索引。

- 实体键盘左区由角色左手、右区由角色右手响应，面对用户时画面左右镜像。前后落点继续区分，空格由左手按下；右手优先键盘，空闲时响应鼠标。
- 设置 → 互动可调手部移动速度（50%—200%），选择单个或多个按键浮显。多键模式上限可调1～6个，默认1个，每个独立停留后淡出，不保存按键记录。
- 大头弹性回摆，发饰随动，凤凰翅膀、尾羽和火苗持续动态；可选完整、轻柔或关闭动态。
- 17个可用表情、3段小动作、36条互动气泡、50%—200%连续大小调节。
- Windows透明置顶、托盘、鼠标穿透与恢复快捷键、全屏避让、边缘磁吸、3个常用位置。

## 支持开发

桌宠免费使用，欢迎自愿[微信或支付宝赞助](docs/sponsor/README.md)支持后续开发。

## 开发

Windows需要Node.js、Rust、Microsoft C++ Build Tools / Windows SDK与WebView2。

```powershell
npm ci
npm run desktop
```

浏览器预览：`npm run dev`。检查：`npm run typecheck`、`npm test`。Windows打包：`npm run package:windows`。

浏览器只能预览角色和交互；全局输入、透明桌面窗口、托盘、磁吸与全屏避让需要运行桌面应用。

### macOS 编译与使用

需要 Node.js/npm、Rust/Cargo 和 Xcode Command Line Tools。首次安装 Apple 编译工具可执行 `xcode-select --install`。

在源码根目录运行：

```bash
./macos/build.sh
```

编译完成后，按终端输出的路径打开 `离火长明.app`，或打开 `.dmg` 将应用拖入“应用程序”。构建产物保存在源码目录之外。当前支持 Apple Silicon Mac。

首次使用全局键鼠互动，请在“系统设置 → 隐私与安全性 → 输入监控”中添加并允许“离火长明”，然后重新启动应用。可在桌宠设置中选择输入模式、开关鼠标视线跟随和按键浮显。更换或更新应用后，请检查输入监控授权，必要时移除旧条目，重新添加已安装的应用并重启。

需要登录后自动启动时，先将应用安装到“应用程序”，再在桌宠“设置 → 高级”中打开“开机启动”。关闭该开关即可取消自启动。

需要全屏避让时，在桌宠“设置 → 桌面”中打开“全屏自动避让”。同屏前台全屏窗口出现时隐藏，退出后恢复；例外可填写 `Safari.app` 或 `com.apple.Safari`，多个用逗号分隔。

## 当前完成度

当前 Windows 版本为 **0.7.15**，macOS 适配版为 **0.7.15-macos.1**，共用原生模型 v71。

程序和当前运行资源可用。新增表情由原生Cubism参数与运行时矢量美术组合；动态和轮廓修整部分在运行时实现，未写回CMO3，未产生新的MOC3导出。独立精细原生表情、完整抬臂挥手与袖口/发束最终美术验收仍未全部完成，不能称完整美术正式版，也未宣称达到参考作者同等完成度。详见[交付记录](DELIVERY-0.7.15.md)。

已验证Cubism源位于[authoring](authoring/README.md)，当前模型位于`public/models/changli/live-reference-repair-v71-candidate/`。历代模型、编译缓存、本机日志和旧交付留在本机，不进入仓库。历史制作脚本可能依赖这些本机资源。

角色与参考素材的权利和SDK许可见[第三方说明](THIRD-PARTY-NOTICES.md)。仓库可见性不改变素材许可。

各版本分别留档，下载与源码来源见[版本索引](VERSION-ARCHIVES.md)。旧tag和Release附件不覆盖，新版本使用新的版本号。
