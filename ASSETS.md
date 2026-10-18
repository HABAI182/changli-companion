# 当前素材与来源

当前应用版本 0.7.16，原生运行模型为 v71。角色参考和衍生视觉素材的来源按用户声明记录为其生成；该声明不授予角色 IP 权利，也不表示官方背书。仅参考展示作者的构图、动作反馈与节奏，没有复制其模型、贴图、语音或制作工程。

| 路径 | 用途与来源 |
| --- | --- |
| `public/models/changli/preview.jpg` | 用户提供的角色原图，用于造型校对 |
| `public/models/changli/assets/` | 原图透明处理、局部补绘、图标与运行时叠加资源 |
| `public/models/changli/live-reference-repair-v71-candidate/` | 当前官方导出的 MOC3、model3、纹理、动作、表情和物理文件 |
| `public/models/changli/model.json` | 当前模型入口、运行时造型与交互配置 |
| `public/models/changli/assets/keyboard-changli-v0716.svg` | 项目绘制的可编辑键帽结构，不改变完整物理键盘输入映射 |
| `public/models/changli/assets/audio/key-press-v0716.wav`、`mouse-press-v0716.wav` | `tools/generate_key_feedback.py` 固定随机种子合成，无第三方采样或语音 |
| `src-tauri/icons/` | 基于用户原图生成和转换的应用图标 |

文件与配置引用由 `npm run check:repository` 检查。运行时补绘和顶点效果与原生模型分开维护；修改前应检查实际加载入口。未使用的旧运行候选仍保留，避免误改加载回退行为。

可编辑 v71 CMO3 单独私有保管，恢复信息见 [authoring](authoring/README.md)。过程提示词、旧交付和一次性制作工具已移出当前源码，完整历史先保存于维护者私有镜像。旧 Tag 和 Release 继续保留原始内容。

SDK/Core 和角色素材不适用本仓库代码 MIT 的额外授权，详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)和 [LICENSE-SCOPE.md](LICENSE-SCOPE.md)。
