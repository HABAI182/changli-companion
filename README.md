# 离火长明 · Q版长离 Live2D 桌宠

Windows x64 桌面伴侣，当前免费公测版 **0.7.12 / 原生模型 v71**。采用 Tauri、React、TypeScript 与 Live2D Cubism SDK。另提供保留原有业务源码的 macOS 编译入口，支持 Apple Silicon 本机构建；功能范围见下方 macOS 说明。

<img src="public/models/changli/preview.jpg" alt="长离桌宠预览" width="320" />

0.7.12新增按键浮现随桌宠同比缩放、可拖动的互动菜单标题栏；脸红移到害羞右侧，更多表情放在设置与个性化上方。

## 公测说明

新版采用圆角长离图标、精简设置标题与立体键帽；右键菜单独立显示在桌宠旁边。修正启动时桌宠窗口被误判为输入编辑窗口。按键浮现默认开启，保存过的偏好不会被强制修改。

软件免费公测，未商业签名；下载安装前请核对Release附带的SHA256.json，另见[安全与隐私说明](SECURITY.md)、[许可说明](LICENSE-RUNTIME.txt)和[宣传视频制作prompt](PROMO-VIDEO-PROMPT.md)。新版本和历史版本分别留档。

## 使用

下载[当前0.7.12便携EXE或安装包](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.12)，程序无需开发服务器。右键角色打开互动菜单和设置；拖动键位于键盘右下角。历史版本分别留档，见文末版本索引。

- 键盘都由长离左手按压，按左右/前后四区移动，前后幅度较小；空格单独落点，右手与鼠标本体、线缆联动。
- 大头弹性回摆，发饰随动，凤凰翅膀、尾羽和火苗持续动态；可选完整、轻柔或关闭动态。
- 17个可用表情、3段小动作、36条互动气泡、50%—200%连续大小调节。
- Windows透明置顶、托盘、鼠标穿透与恢复快捷键、全屏避让、边缘磁吸、3个常用位置。

0.7.9使用用户上传的完整原图作为图标，设置改为外观/互动/桌面/高级四分页；新增系统/深浅主题、强调色、布局密度、视线跟随、弹性与键鼠幅度、气泡时长及空闲频率。设置窗口置顶并聚焦，保存后保持在桌宠前面；高级页的GitHub更新按钮打开GitHub版本下载页，项目主页按钮打开仓库，未加入自动下载安装。0.7.8将鼠标重建为完整底层，手掌和袖口分前后绘制；袖口底层随大头变形，键盘手上方下颌沿用原脸纹理并柔化接缝，图标采用参照桌宠原图生成的长离头像。0.7.7修复鼠标手左侧前景残留，并补全键盘手移开后露出的下颌缺角；补片随原生脸部变形。0.7.6将生气火苗移到头部外缘、放大并加轮廓，改善小尺寸识别。0.7.5将开心改为睁眼微笑，困倦使用闭眼、大小递减的zzz和少量口水。移除打招呼、入睡两项动作与过期快捷键目标；保留凤凰互动、生气冒火和害羞。生气新增随脸运动的火苗。气泡随桌宠等比缩放、去掉末尾句号，边框加粗。靠近淡化默认关闭。应用和托盘共用珊瑚粉发色、白发尾、金色发饰的简约长离头像图标。

设置增加按程序文件名指定的全屏避让例外，小动作菜单改为双列。保留手部轮廓修整、左尾羽加长22%、大头弹性和凤凰动态。

## 支持开发

桌宠免费使用，欢迎自愿[微信或支付宝赞助](docs/sponsor/README.md)支持后续开发。

## 开发

Windows需要Node.js、Rust、Microsoft C++ Build Tools / Windows SDK与WebView2。

```powershell
npm ci
npm run desktop
```

浏览器预览：`npm run dev`。检查：`npm run typecheck`、`npm test`。Windows打包：`npm run package:windows`。

浏览器只能预览角色和交互；全局输入、透明桌面窗口、托盘、磁吸与全屏避让需要运行Windows程序。

### macOS 编译

需要 macOS、Xcode Command Line Tools、Node.js/npm 和 Rust/Cargo。首次安装 Apple 编译工具可执行 `xcode-select --install`。本次已在 Apple Silicon、macOS 26.5.1、Node.js 26.8.1 和 Rust 1.98.1 上完成构建验证。

在源码根目录执行：

```bash
./macos/build.sh
```

脚本会将源码同步到**源码目录旁的独立构建目录**，安装锁定版本的依赖，再编译 macOS 应用和 DMG。以源码目录名 `ChangliCompanion` 为例，目录结构为：

```text
Project_codex/
├── ChangliCompanion/                   # 源码，可单独上传
│   ├── README.md
│   └── macos/                         # 编译配置和脚本
└── ChangliCompanion-build/             # 本机生成，不属于源码
    ├── cache/npm/                     # npm 缓存
    ├── workspace/                     # 用于编译的源码副本与依赖
    │   └── src-tauri/target/release/bundle/
    │       ├── macos/离火长明.app
    │       └── dmg/离火长明_0.7.12_aarch64.dmg
    └── deliveries/                    # 本机已有交付存档（若存在）
```

构建目录名自动使用“源码文件夹名 + `-build`”。`node_modules`、前端 `dist`、Rust `target`、生成的 schema 和安装包均只写入构建副本；Tauri CLI 对 `Cargo.toml` 的自动调整也只发生在副本中。重新上传时只上传源码文件夹。

如果 macOS 同步文件夹给生成的应用附加 Finder 元数据、导致签名失败，脚本会清理生成应用的扩展属性后重试一次；构建日志保留在外部构建目录。若构建进程被强制结束，确认没有构建在运行后可移除外部目录中的空 `.build-lock` 文件夹再运行。

打开编译后的应用，或打开 DMG 将应用拖入“应用程序”：

```bash
open "../ChangliCompanion-build/workspace/src-tauri/target/release/bundle/macos/离火长明.app"
```

只生成应用、不生成 DMG：

```bash
./macos/build.sh --bundles app
```

运行 Rust 原生测试，同样使用外部构建目录：

```bash
./macos/test.sh
```

若本机网络需要代理，请将地址替换为实际配置：

```bash
HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
CARGO_HTTP_PROXY=http://127.0.0.1:7892 \
npm_config_proxy=http://127.0.0.1:7892 ./macos/build.sh
```

macOS 配置使用 `.icns` 图标、app/dmg 打包和本地 ad-hoc 签名，并启用当前 Tauri 2.11.6 透明窗口需要的 `macOSPrivateApi` / `macos-private-api` 功能。没有 Apple Developer ID 签名或公证。配置最低系统版本为 macOS 12；旧系统、Intel 和 Universal 构建尚未验证。

macOS 已增加独立的全局键鼠监听和鼠标视线跟随模块。原有 Windows 监听实现保持原样，只有输入入口增加平台条件分支；macOS 模块不会参与 Windows 编译，Cargo 依赖和前端协议未变。

鼠标视线跟随通过只读轮询系统鼠标位置实现，按桌宠所在屏幕的缩放比例转换坐标。全局键盘、鼠标左右键、滚轮和触控板滚动使用 CoreGraphics 的只读事件监听；物理按键映射为现有按键动画，支持 Cmd、Shift、Option、Control、功能键和数字小键盘，不提取输入文本。设置或互动菜单获得焦点时暂停其输入反馈。

首次使用全局键鼠监听，请完成系统授权：

1. 将编译后的 `离火长明.app` 放到固定位置（例如“应用程序”）并启动。
2. 打开“系统设置 → 隐私与安全性 → 输入监控”，用 `+` 添加该应用并允许监听。
3. 如果系统要求重启应用，请退出并重新打开。在桌宠“设置 → 高级”中点击“刷新监听状态”查看结果。

未授予输入监控权限时，应用继续运行，鼠标视线跟随仍可用；状态中会显示授权说明。获得或撤销权限后监听线程会定期检查并重新注册或停止监听。密码框等安全输入场景可能由系统暂停键盘事件。应用不会自动修改系统权限，也不申请屏幕录制权限；只有瞬时动作事件和内存汇总计数，不记录按键历史、不注入或拦截输入。现有“键鼠模式／纯键盘模式”“鼠标视线跟随”“按键浮显”等设置继续生效。

已有 Live2D 显示与摸头气泡交互验收；本次原生测试增加到 15 项。键鼠监听的跨应用实机效果需要在输入监控授权后验收。拖动、多屏/DPI、开机自启、全局快捷键和长期运行尚未全面验收。其余 Windows 专用功能限制如下：

| 功能 | macOS 状态 |
| --- | --- |
| 全局键鼠监听、鼠标视线跟随 | 已实现 macOS 独立模块；键盘、点击和滚轮监听需要输入监控授权 |
| 手柄监听 | 原实现依赖 Windows XInput，macOS 未实现 |
| 外部全屏应用自动隐藏 | 非 Windows 分支固定返回 false |
| 设置中的项目主页／更新链接 | 原代码调用 `explorer.exe`，macOS 不可用；可手动打开仓库或 Release 页 |

普通 macOS 桌面 `tauri dev` 会因上游两个 `generate_context!()` 重复嵌入 Info.plist 而编译失败。前端开发可使用 `npm run dev`；桌面验证使用上述发行构建入口。原生测试脚本启用与发行构建一致的 `custom-protocol`，无需修改 Rust 业务源码。

## 当前完成度

0.7.5通过81个前端测试、12个原生测试、39个Live2D引用检查。实际App WebGL检查9种按键、开心/困倦/生气冒火、移除动作、气泡50%/100%/200%比例；Windows便携EXE实测全局Q/A/U/H四区、透明模型、开心/困倦、气泡、新图标和设置。EXE及NSIS安装包构建成功；本版安装包没有重复安装/卸载验收。多屏/DPI尚未全面验证。

程序和当前运行资源可用。新增表情由原生Cubism参数与运行时矢量美术组合；动态和轮廓修整部分在运行时实现，未写回CMO3，未产生新的MOC3导出。独立精细原生表情、完整抬臂挥手与袖口/发束最终美术验收仍未全部完成，不能称完整美术正式版，也未宣称达到参考作者同等完成度。详见[交付记录](DELIVERY-0.7.12.md)。

已验证Cubism源位于[authoring](authoring/README.md)，当前模型位于`public/models/changli/live-reference-repair-v71-candidate/`。历代模型、编译缓存、本机日志和旧交付留在本机，不进入仓库。历史制作脚本可能依赖这些本机资源。

角色与参考素材的权利和SDK许可见[第三方说明](THIRD-PARTY-NOTICES.md)。仓库可见性不改变素材许可。

各版本分别留档，下载与源码来源见[版本索引](VERSION-ARCHIVES.md)。旧tag和Release附件不覆盖，新版本使用新的版本号。
