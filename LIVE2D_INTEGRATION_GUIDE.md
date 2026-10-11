# 正式长离 Live2D 接入指南

当前默认入口 `live/ChangliCandidate.model3.json` 是已可运行的技术候选模型，重建方法见 `tools/live2d-authoring/README.md`。替换正式模型时保留以下资源约定，并重新验收所有参数、动作与命中区域。

1. 将自行制作且有权使用的 Cubism Editor 导出包放在 `public/models/changli/live/`，例如 `Changli.model3.json`、`Changli.moc3`、`textures/*.png`。`.model3.json` 内的相对路径必须真实存在且留在模型目录内。physics、pose、userdata、expressions、motions 可选；缺少时运行时记录警告并跳过。
2. 在 `public/models/changli/model.json` 设 `renderer.live2d.entry` 为 `live/Changli.model3.json`。`renderer.live2d.parameterMap` 的键写语义、值写真正的 Cubism 参数 ID，例如 `"eye.x": "ParamEyeBallX"`、`"eye.left.open": "ParamEyeLOpen"`、`"mouth.open": "ParamMouthOpenY"`、`"head.x": "ParamAngleX"`、`"breath": "ParamBreath"`。支持 `head.x/y/z`、`eye.x/y`、双眼开合、`mouth.open/form`、`body.z`、`breath`，并兼容旧键 `gazeX/Y`、`blinkL/R`、`breathe`、`hairSway`、`ornamentSway`、`phoenixFloat`。数值范围须按实际模型参数校准。
3. `motionMap` 的键写程序动作 ID（如 `pet`、`body`、`wave`），值写 model3 的动作组及索引（如 `TapBody/0`）；`expressionMap` 的键写程序表情 ID（如 `smile`、`sleepy`），值写 `Expressions[].Name`。未配置的动作/表情不会伪造绑定效果。
4. `model.json` 的 `hotspots.head` 和 `hotspots.body` 使用 `[左, 上, 宽, 高]` 的 0–1 相对画布坐标。当前命中区域为矩形覆盖层，应按新模型预览调整；Cubism ArtMesh 级命中尚未实现。
5. 运行 `npm test`、`npm run typecheck`、`npm run build`、`npm run desktop`。先观察控制台资源警告，再在真实 Windows 透明窗口验证纹理、缩放、头/身体点击、动作、表情、physics、鼠标视线和回退。可在设置或托盘切换渲染模式并重新初始化角色。若替换的是发行包内资源，须重新构建和打包；按钮不会导入磁盘上的外部模型。

故障判断：入口缺失、`.moc3` 或贴图缺失会回退；Vite 对不存在的资源可能返回 HTML，预检会识别；可选动作/表情缺失只会禁用对应资源；WebGL 或 Core 失败会保留占位画面并在控制台报错。`capabilities.live2d` 现在表示候选 Cubism 模型可加载，不表示正式美术已完成；勿把示例模型或当前技术候选当成长离最终成品。
