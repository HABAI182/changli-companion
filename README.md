# 离火长明 · Q版长离 Live2D 桌宠

Windows x64 桌面伴侣，当前工程版 **0.7.4 / 原生模型 v71**。采用 Tauri、React、TypeScript 与 Live2D Cubism SDK。

<img src="public/models/changli/preview.jpg" alt="长离桌宠预览" width="320" />

## 使用

在 GitHub Releases 下载便携 EXE 或安装包，程序无需开发服务器。右键角色打开互动菜单和设置；拖动键位于键盘右下角。

- 键盘都由长离左手按压，按左右区域横移，空格回中；右手与鼠标本体、线缆联动。
- 大头弹性回摆，发饰随动，凤凰翅膀、尾羽和火苗持续动态；可选完整、轻柔或关闭动态。
- 17个可用表情、5段小动作、36条互动气泡、50%—200%连续大小调节。
- Windows透明置顶、托盘、鼠标穿透与恢复快捷键、全屏避让、边缘磁吸、3个常用位置。

0.7.4补齐脸红、大笑、生气、鼓脸、害羞、委屈、得意、凤凰瞳和火焰眼，新增跟随脸部网格的嘴形、泪珠与眼部效果。打招呼、凤凰互动、入睡、生气冒火和害羞具有不同的姿态与表情，结束后恢复之前选择。打招呼目前为点头致意，不包含完整抬臂挥手。

设置增加按程序文件名指定的全屏避让例外，小动作菜单改为双列。保留手部轮廓修整、左尾羽加长22%、大头弹性和凤凰动态。

## 开发

Windows需要Node.js、Rust、Microsoft C++ Build Tools / Windows SDK与WebView2。

```powershell
npm ci
npm run desktop
```

浏览器预览：`npm run dev`。检查：`npm run typecheck`、`npm test`。Windows打包：`npm run package:windows`。

浏览器只能预览角色和交互；全局输入、透明桌面窗口、托盘、磁吸与全屏避让需要运行Windows程序。

## 当前完成度

0.7.4通过真实App WebGL检查：17表情、5动作、表情恢复、键盘分区、鼠标本体联动、大头弹性与凤凰动态。79个前端测试和11个原生测试通过。EXE及NSIS安装包构建成功，Windows透明桌宠、设置菜单、大笑表情、安装和卸载已实测；卸载保留用户配置。多屏/DPI尚未全面验证。

程序和当前运行资源可用。新增表情由原生Cubism参数与运行时矢量美术组合；动态和轮廓修整部分在运行时实现，未写回CMO3，未产生新的MOC3导出。独立精细原生表情、完整抬臂挥手与袖口/发束最终美术验收仍未全部完成，不能称完整美术正式版，也未宣称达到参考作者同等完成度。详见[交付记录](DELIVERY-0.7.4.md)。

已验证Cubism源位于[authoring](authoring/README.md)，当前模型位于`public/models/changli/live-reference-repair-v71-candidate/`。历代模型、编译缓存、本机日志和旧交付留在本机，不进入仓库。历史制作脚本可能依赖这些本机资源。

角色与参考素材的权利和SDK许可见[第三方说明](THIRD-PARTY-NOTICES.md)。仓库可见性不改变素材许可。

各版本分别留档，下载与源码来源见[版本索引](VERSION-ARCHIVES.md)。旧tag和Release附件不覆盖，新版本使用新的版本号。
