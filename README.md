# 离火长明 · Q版长离 Live2D 桌宠

Windows x64 桌面伴侣，当前工程版 **0.7.3 / 原生模型 v71**。采用 Tauri、React、TypeScript 与 Live2D Cubism SDK。

<img src="public/models/changli/preview.jpg" alt="长离桌宠预览" width="320" />

## 使用

在 GitHub Releases 下载便携 EXE 或安装包，程序无需开发服务器。右键角色打开互动菜单和设置；拖动键位于键盘右下角。

- 键盘都由长离左手按压，按左右区域横移，空格回中；右手与鼠标本体、线缆联动。
- 大头弹性回摆，发饰随动，凤凰翅膀、尾羽和火苗持续动态；可选完整、轻柔或关闭动态。
- 8个基础表情、36条互动气泡、50%—200%连续大小调节。
- Windows透明置顶、托盘、鼠标穿透与恢复快捷键、全屏避让、边缘磁吸、3个常用位置。

0.7.3修整手部上缘残片，左尾羽加长22%，删除不自然的拖动抬手及鼠标倾手/滚轮变体，改善底部摆放限制。

## 开发

Windows需要Node.js、Rust、Microsoft C++ Build Tools / Windows SDK与WebView2。

```powershell
npm ci
npm run desktop
```

浏览器预览：`npm run dev`。检查：`npm run typecheck`、`npm test`。Windows打包：`npm run package:windows`。

浏览器只能预览角色和交互；全局输入、透明桌面窗口、托盘、磁吸与全屏避让需要运行Windows程序。

## 当前完成度

0.7.3已通过真实App WebGL渲染检查和Windows启动、右下角手柄横向/上下拖动、底部摆放实测。79个前端测试和10个原生测试通过。安装卸载、多屏/DPI尚未全面验证。

精细表情、完整原生动画与袖口/发束最终美术验收仍未全部完成。本轮动态和轮廓修整主要在运行时实现，未宣称新的Cubism原生导出或达到参考作者同等完成度。

已验证Cubism源位于[authoring](authoring/README.md)，当前模型位于`public/models/changli/live-reference-repair-v71-candidate/`。历代模型、编译缓存、本机日志和旧交付留在本机，不进入仓库。历史制作脚本可能依赖这些本机资源。

角色与参考素材的权利和SDK许可见[第三方说明](THIRD-PARTY-NOTICES.md)。仓库可见性不改变素材许可。
