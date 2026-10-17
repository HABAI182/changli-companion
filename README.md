# 离火长明 · Q版长离 Live2D 桌宠

支持 Windows x64 与 macOS Apple Silicon 的桌面伴侣。Windows 当前免费公测版 **0.7.16**，macOS 独立公测版 **0.7.15-macos.1**，共用原生模型 v71。采用 Tauri、React、TypeScript 与 Live2D Cubism SDK。

<img src="public/models/changli/preview.jpg" alt="长离桌宠预览" width="320" />

[B站主页](https://space.bilibili.com/1605091088) · [桌宠演示视频](https://www.bilibili.com/video/BV1Pipf6AEQF/)

0.7.16 让右键菜单随内容收缩，展开更多表情时自动增高；透明边缘和键盘下方可点击穿透。新增鼠标空闲后视线柔和回正，默认等待3秒，可关闭或调为1～15秒；键盘改为近大远小的立体键帽与完整侧面。可选按键反馈轻音，实际敲键/点击才发声，长按不连响，文字气泡不配音。

沿用0.7.15的高权限兼容启动（默认开，可在桌面设置关闭，启动仍需Windows确认）。长按时只弹动一次，随后保持落键，松开回位；重复浮现独立可选，上限可调1～6个，默认1个。鸣潮实测结论来自0.7.15管理员候选版；0.7.16未新增游戏实测。

## 公测说明

新版采用圆角长离图标、精简设置标题与立体键帽；右键菜单独立显示在桌宠旁边。修正启动时桌宠窗口被误判为输入编辑窗口。按键浮现默认开启，保存过的偏好不会被强制修改。

软件免费公测，未商业签名；下载安装前请核对Release附带的SHA256.json，另见[安全与隐私说明](SECURITY.md)和[许可说明](LICENSE-RUNTIME.txt)。新版本和历史版本分别留档。

## 使用

按系统选择下载，程序无需开发服务器：

| 系统 | 下载 | 文件类型 |
| --- | --- | --- |
| Windows x64 | [Windows 0.7.16](https://github.com/HABAI182/changli-companion/releases/tag/v0.7.16) | 便携 EXE / EXE 安装包 |
| macOS Apple Silicon（M 系列） | [macOS 0.7.15-macos.1](https://github.com/HABAI182/changli-companion/releases/tag/macos-0.7.15-preview.1) | DMG / APP ZIP；最低 macOS 12 |

macOS 0.7.15-macos.1 收录自 [Kyusakino 的适配版本](https://github.com/Kyusakino/changli-companion-macos/releases/tag/macos-0.7.15-preview.1)，安装、输入监控授权与源码入口见 [macOS 发布说明](docs/MACOS-0.7.15-macos.1.md)。Source code ZIP 为开发者源码；旧版继续在 Releases 独立留档。

右键角色打开互动菜单和设置；拖动键位于键盘右下角。历史版本分别留档，见文末版本索引。

- 实体键盘左区由角色左手、右区由角色右手响应，面对用户时画面左右镜像。前后落点继续区分，空格由左手按下；右手优先键盘，空闲时响应鼠标。
- 设置 → 互动可调手部移动速度（50%—200%），选择单个或多个按键浮显。多键模式上限可调1～6个，默认1个，每个独立停留后淡出，不保存按键记录。
- 大头弹性回摆，发饰随动，凤凰翅膀、尾羽和火苗持续动态；可选完整、轻柔或关闭动态。
- 17个可用表情、3段小动作、36条互动气泡、50%—200%连续大小调节。
- Windows透明置顶、托盘、鼠标穿透与恢复快捷键、全屏避让、边缘磁吸、3个常用位置。
- Windows透明空白自动穿透，保留角色与拖动键；手动完全穿透仍优先，可从托盘/恢复快捷键退出。
- 互动设置可调整视线回正开关和等待秒数；高级 → 手柄与音效可开启按键反馈音并调节音量，默认关闭。

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

## 当前完成度

Windows 0.7.16 与 macOS 0.7.15-macos.1 分开交付与验收；0.7.16 未新增游戏实测。2026-10-17 对当前源码执行：102 个前端测试、19 个 Windows Rust 单元测试、TypeScript 检查和前端生产构建通过，源码与 dist 的 51 项运行引用完整。本轮未重新运行安装器、物理输入、游戏或 macOS；CI 以 Actions 实际结果为准。旧 0.7.5 的检查移至[历史验证](docs/repository-audit/HISTORICAL-VALIDATION.md)，不能替代新版验收。

程序和当前运行资源可用。新增表情由原生Cubism参数与运行时矢量美术组合；动态和轮廓修整部分在运行时实现，未写回CMO3，未产生新的MOC3导出。独立精细原生表情、完整抬臂挥手与袖口/发束最终美术验收仍未全部完成，不能称完整美术正式版，也未宣称达到参考作者同等完成度。详见[交付记录](DELIVERY-0.7.15.md)。

已验证Cubism源位于[authoring](authoring/README.md)，当前模型位于`public/models/changli/live-reference-repair-v71-candidate/`。历代模型、编译缓存、本机日志和旧交付留在本机，不进入仓库。历史制作脚本可能依赖这些本机资源。

角色与参考素材的权利和SDK许可见[第三方说明](THIRD-PARTY-NOTICES.md)。仓库可见性不改变素材许可。

各版本分别留档，下载与源码来源见[版本索引](VERSION-ARCHIVES.md)。旧tag和Release附件不覆盖，新版本使用新的版本号。


维护入口：[资产清单](docs/repository-audit/ASSET-INVENTORY.md) · [依赖图](docs/repository-audit/DEPENDENCY-MAP.md) · [许可范围](LICENSE-SCOPE.md) · [发行检查表](docs/RELEASE-CHECKLIST.md)。
