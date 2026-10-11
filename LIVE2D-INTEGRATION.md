# 长离 Cubism 模型接入

工程已包含官方 Cubism SDK for Web R5 的 Core、Framework 和 WebGL 着色器，并通过 `CubismBackend` 加载真实的 Cubism Editor 导出文件。当前没有长离 `.moc3`，所以正式画面仍是透明 PNG 预览。

通用链路已用 SDK 附带的示例模型在本机浏览器与 Windows 原生透明窗口测试绘制；示例素材未随本项目分发。加载模型后会等待异步着色器就绪再隐藏预览图。此项验证不能代替长离模型的外观、动作、表情及性能验收。

将合法制作的模型文件整体放在 `public/models/changli/live/`。在 `public/models/changli/model.json` 中将 `renderer.live2d.entry` 设为相对路径，如 `live/Changli.model3.json`；入口及其引用的 `.moc3`、贴图、动作、表情、physics、pose 必须在该目录下真实存在。应用会校验引用文件，并在加载失败时回退预览图。

`parameterMap` 的键是程序语义，值是模型中的真实 Cubism 参数 ID。支持 `gazeX`、`gazeY`、`blinkL`、`blinkR`、`breathe`、`hairSway`、`ornamentSway`、`phoenixFloat`。其中视线约为 -1～1，眼睛开合约为 0～1；实际数值范围须在绑定时核对。`motionMap` 的键为程序动作 ID，值为 `model3.json` 里的动作组/索引，例如 `Idle/0`。`expressionMap` 的键为程序表情 ID，值为 `Expressions[].Name`。这些映射现在留空，因为不能猜测尚不存在的模型参数。

只在真实模型经过加载、贴图、参数、动作与表情的浏览器及 Windows 透明窗口实测后，才将 `model.json` 的 `capabilities.live2d` 改为 `true`。静态预览图、AI 分层候选稿和示例模型都不能算长离 Live2D 成品。

分层创作要求见 `ART-ASSET-REQUEST.md`。需要从用户参考形象重绘可动的独立图层，补全遮挡处，再在 Cubism Editor 中建立 ArtMesh、变形器、参数、物理和动作。运行时与模型的许可证不同；SDK 许可文本与打包说明见 `THIRD-PARTY-NOTICES.md`。工程没有包含官方示例模型或宇痕冫的素材。
