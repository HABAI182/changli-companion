# 素材与替换

最终造型依据：用户提供 `18393dc1014fdf0f8fd863c95d88fe3e.jpg`。保留粉白渐层发型、花/蝴蝶发饰、金红瞳、小肉团双手、键鼠和小凤凰。没有把前两轮自绘/生成稿冒充为最终造型。

| 文件                                                     | 来源                               | 状态与用途                                                                                              |
| -------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| public/models/changli/preview.jpg                        | 用户提供原图                       | 完整保存；权利/作者未由用户说明，仅作本项目参考，未宣称原创或公开分发许可                               |
| public/models/changli/assets/changli-cutout.png          | 内置 imagegen 对用户图做背景去除   | 1254×1254 RGBA；左上角 Alpha=0，图内像素有非零 Alpha；默认造型预览，可替换；不是原始 PSD 或 Live2D 模型 |
| tools/live2d-authoring/assets/closed-eyes-candidate.png  | 内置 imagegen 基于用户图制作       | 可替换闭眼技术素材；仅用于模型重建，不代表最终分层美术                                                  |
| public/models/changli/live/ChangliCandidate.moc3         | 本项目构建脚本生成                 | 可运行的 Cubism 技术候选模型；4 个网格部件、7 个参数，不是最终精细 Live2D                               |
| src/Renderer.tsx                                         | 本项目程序化 SVG 原型              | 用户否定其造型，默认不展示，仅开发实验室可选，用于验证分层逻辑                                          |
| public/assets/icon.svg 与 src-tauri/icons                | 本项目灯具图标，由 Tauri icon 转换 | 应用/托盘图标，无角色素材授权替代作用                                                                   |
| public/models/changli/assets/audio/placeholder-chime.wav | 本项目脚本生成的原创提示音         | 完成专注时可选播放；明确为可替换占位音，默认关闭；不含游戏语音                                          |

## 当前精细动画状态

### Phase 2 分层与 Live2D 制作清单

`public/models/changli/assets/layers/layers.json` 已规定同一 1254×1254 透明画布、z 顺序、归一化锚点与旋转中心。当前 15 个图层的 `asset` 均为 `null`，渲染器自动使用现有长离整图，不能把它称为完成拆层。

需原创补绘：后发、身体/肩部、脸、左右眼、眉、嘴、前发、两侧金黑发饰/流苏、左右臂手、键盘、鼠标、小凤凰和前景特效。尤其要补齐手臂被身体/桌案遮住的轮廓、发层交界、闭眼皮肤、嘴型、两手上键盘后鼠标区域、鼠标手下方以及凤凰背后的角色轮廓。动作帧需要共享画布与这些锚点，不能各帧按可见像素分别裁剪。

用户新增的视觉目标是接近宇痕冫桌宠在 Q 版比例、桌前键鼠构图、表情精度和动作节奏上的体验。长离身份特征以用户提供的原图与官方设定为准：珊瑚粉到白色的发梢、金黑发饰、金红眼睛、小肉团双手、键鼠与小凤凰。现已接入并绘制长离 Cubism 技术候选模型，原图默认姿态、眨眼及少量表情/动作可运行；最终 Live2D 仍需完整原创分层、被遮挡区域补绘、精细网格和绑定。候选模型不能据此宣称已达到上述视觉目标。

默认 PNG 仍作为模型加载失败时的完整静态预览。候选模型的眼睛是独立 ArtMesh，可闭眼；手、头发、凤凰仍不能独立运动。model.json 的 17 个表情中仅 4 个绑定技术表情，其余待绘；5 个完整动画的帧仍为空。表现层播放器、25 槽快捷键和右键触发可以切状态，但不会冒充已有正式图片。完整交付规格见 [ART-ASSET-REQUEST.md](ART-ASSET-REQUEST.md)。

开发实验室旧 SVG 有独立双手、眼睛、喝茶、盖章等程序动作，只验证状态/动作逻辑，不代表用户指定新图具备相同动画。

## 替换约定

- 保持统一 1254×1254 透明画布及锚点；禁止按各帧内容分别裁剪造成抖动。
- 需要 idle/闭眼帧、keyboard_left 上/下、keyboard_right 上/下、mouse 上/下，以及两种输入模式的基础姿势。
- 17 套表情要有可见的脸部差异；五套完整动画需给帧序列及每帧持续时间。
- 后发/前发/饰品/脸/左右眼/左右臂和手/身体/键盘/鼠标/凤凰应独立分层，补全遮挡区域，并记录旋转中心。
- 将文件放入 `public/models/changli/assets`，在 model.json 对应资源或表情中填写相对路径。没有真实帧之前保留 awaiting-art，不能用同一图冒充多个表情。
- 当前 RendererHost 在配置模型入口后启用官方 Cubism 后端，加载失败回退静态图；未配置模型时按分层 → 静态图选择。PresentationRuntime 已有动画状态与时长控制。真正的长离分层、Cubism 模型和动作资源仍待制作。

## 已核对的参考与读取范围

- 用户指定 [长离 GIF 动态表情全套 46 枚](https://www.bilibili.com/video/BV1we64BjEGH/)：读取了公开视频元数据与封面；简介标注「画师@时时」。未取得 GIF 包或模型。
- [宇痕冫爱莉希雅桌宠](https://www.bilibili.com/video/BV1456HY5E6M/) 与 [银狼桌宠](https://www.bilibili.com/video/BV1u94y187Ax/)：读取了作者、简介和公开封面，只参考构图与视觉语言；未下载模型、贴图工程或语音，未声称逐帧看完视频。
- [鸣潮官方《执棋》动态](https://www.bilibili.com/opus/955715319813374003) 和 [Good Smile 官方长离页面](https://www.goodsmile.com/en/product/1139014/Nendoroid+Changli)：核对造型。原图没有打包进产品资源。
- 用户提供语雀页返回 401、B 站空间搜索返回 412/超时，未读取其中的模型资料，也未尝试绕过。

## 最终透明处理提示词

使用 **内置 imagegen**，输入仅为用户提供的 JPG。最终提示词：

> Use case: background-extraction. EDIT THIS EXACT PROVIDED IMAGE, not a redesign. Preserve the original Changli chibi illustration's face, hair shape and colors, eyes, gold-and-black butterfly ornaments, black ribbons, white hair tips, tiny body, two round paw-like hands, mouse on viewer left, keyboard at bottom and little round phoenix on viewer right. Preserve the exact character identity, proportions, expression, hand shape, original 2D brushwork, outlines, coloring, composition and all positions. Remove ONLY the plain off-white/pale peach background, pale desk surface outside of the mouse/keyboard/character/phoenix silhouette, all cast shadows on that backdrop, the small floating exclamation marks left of hair, and the floating heart speech bubble on right. Output a clean TRUE TRANSPARENT RGBA PNG cutout containing character, both hands, mouse with its short cable, keyboard and phoenix, maintaining original square canvas dimensions and subject placement. Pixels outside these objects must be alpha transparent, not white or black, not a checkerboard pattern. Keep the full keyboard and hair tips inside canvas. Do not add a desk, lantern, tea cup, scroll, new ornaments, new limbs, background, text or watermark. Do not change to another art style. This will be a replaceable static preview asset in a desktop pet skeleton; accurate preservation of the user's chosen design is mandatory.

AI 处理可能带来局部细节变化，不是无损抠图；原始 JPG 保留供校对。未公开发布、售卖或上传工程。
