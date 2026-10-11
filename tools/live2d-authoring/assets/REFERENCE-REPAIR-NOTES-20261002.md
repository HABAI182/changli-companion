> 2026-10-02 双眼浅弧 v2 最新续接：从 `../ChangliEyeArcAuthoring-v2-candidate.cmo3` 继续，一致快照 `../build/ChangliEyeArcAuthoring-v2-20261002.cmo3`。左右闭合浅弧已原生制作、保存与官方导出；真实 Core 检查左右各九档无翻折、独立开合隔离、视线及原绑定回归、八个实际按钮与四轮眨眼均 PASS。仍需精修闭眼线宽/位置、左发、下脸/嘴、完整发束/凤凰与正式表情动作。默认未切换，无新 Windows 原生验收。详见 [最新检查点](../../../PROGRESS-CHECKPOINT-20261002.md)；下方为历史记录，原图源已导入隐藏，不重复导入或细分。

> 本轮续接更新：`ChangliReferenceRepairSources-v1.psd` 已实际导入安全 CMO3；原图、左发、下脸和嘴源区域继续隐藏，未经正式轮廓描边，不导出。原型四个眼部网格已细分 25 点并官方导出/Core 回归 PASS。当前源 SHA256 为 `97584AF5BD5DFDC04A4C5445051ECEBDA1DC18E0CA359CEEABACED093185FC2D`，快照 `../build/ChangliEyeDenseAuthoring-v1-20261002.cmo3`。Java 应用权限已解除；当前阻塞是截图裁切错误。下方“仅复制/未导入/权限未生效”是此前轮次状态，以 [本轮进度](../../../PROGRESS-CHECKPOINT-20261002.md) 为准。左发与下脸修正本身仍未完成。

# 原图发量与脸型修正 · 2026-10-02

用户明确指出画面左侧多了一点头发、脸型有点歪，并提供新 PNG 原图。该原图优先用于轮廓、位置、颜色核对，不能将整脸强制对称或消除原图自然倾斜。

## 当前观察与验收边界

- 新原图原样复制为 `../references/changli-original-20261002.png`，1254×1254，SHA256 `4CBB720C727716F42BDFC2F6CF5F0C0F2C7F6D4ED554E369C4208F70129161B3`。
- `../reference-review.html` 使用现有官方导出和真实 Core，按照 CanvasOrigin=(627,627)、PixelsPerUnit=1254 映射回 1254 原图坐标，关闭动作和物理以观察默认造型。左图原图、右图中性模型明确分开；参考叠加与单层隐藏都是诊断，不是修正模型。
- 额外红白圆卷可定位到 ArtMesh13 左发。该网格四顶点的包围盒约 `(-55.70,289.50)..(362.40,1007.84)`；这是网格边界，不能当作实际不透明发梢边界。原图左下是窄长、斜向的后发，没有当前向外鼓出的圆卷。
- 原图下脸应保留连续、略倾斜的脸颊/下巴线，嘴在约 (577,794) 附近。当前补绘底层 ArtMesh18 改动过脸部轮廓，嘴的默认网格被压成很窄的水平带；不能靠转正整头掩盖局部画稿问题。需以原图脸部像素重建、修网格，保留独立眼层。
- 原型截图 `../build/reference-review-20261002.png`；真实数据 `reference-review-core-20261002.json`。隐藏和恢复 ArtMesh13、50% 原图叠加控制已实际操作；没有新的 MOC3 导出或 Windows 验收。

## 新素材与包装

- 内置 imagegen 生成 `hair-left-v2-candidate.png`，输出 `exec-9bf3801f-fe17-4ffe-9b0e-dc50c38d3085.png`。1254² RGBA，alpha 范围 0..255，alpha≥8 边界 `(55,403,626,1099)`，SHA256 `BCCF341DE2C68E483226D346A3B1FD449BA55DAD681E4F0333D772C22C47D45C`。
- 下端额外圆卷已移除，但生成器仍放大并偏移了发束，白色上钩和局部线条仍与原图不同。因此是**未采用、未导入的待校准候选**，不是原图无损提取，不能直接替换运行贴图。
- `../ChangliLeftHairRepairDraft-v2.psd` 包装该候选，透明外边裁切、原坐标保留，保存/重读像素一致。
- `../ChangliReferenceRepairSources-v1.psd` 包装原图完整参照，以及原图下脸、嘴、左发三个矩形源区域。全部隐藏，区域内像素原样保留；矩形含周边图案，不是隔离好的正式素材。必须用原生 ArtMesh 轮廓排除背景、眼睛、头发、衣物等，不能直接整块显示。
- `../package_reference_repair.py` 可重建上述两份 PSD，只包装原像素，不重绘、不重采样。证据 `../build/reference-repair-packaging-20261002.json`。

## 原生续接与阻塞

已将 16:14 的验证备份复制为 `../ChangliReferenceRepair-v1-candidate.cmo3`，33113103 字节，SHA256 `11D3693A608D490239EC55A2A2F5C5A072B8F494C8FE3A5ABC579E121C911062`。**它仅是安全施工副本，还没有修正/导入新图。**

旧工作文件 `ChangliEyeLayersAuthoring-v2-candidate.cmo3` 在存档后于 2026-10-01 16:45:41 又保存过，目前 33113270 字节、SHA256 `DDA3EEF94F5B5B5FD0D66030B06447C07BA880C64738F23A18B655EA409C8276`。内容未验收，不覆盖。16:14 备份摘要仍与存档一致。

本轮启动已安装 Cubism，编辑器 Java 主窗可列出。但 Computer Use 在获取窗口时返回 `Computer Use was not approved to use java`。用户明确授权后重新获取仍同样拒绝，说明工具的应用权限尚未生效。没有绕过该权限，未向编辑器发送输入，未保存或导出未经观察的模型。后续需在电脑操作插件应用权限中允许 Cubism 对应 `D:\Live2D Cubism 5.3\app\jre\bin\java.exe`。

恢复后：

1. 打开安全施工副本，将原图参照设为 1:1、隐藏且不导出。先校准 ArtMesh13 根部与下端轮廓，避免重复保留底绘发丝/新增多余圆卷；保留侧发参数与物理。
2. 优先用原图下脸/嘴源像素进行原生网格轮廓修整，不再次整脸生成；检查眼层、腮红、耳饰、颈线和双袖口的遮挡。原图嘴不是当前默认水平短线。
3. 检查独立眨眼、视线、倾斜、双手和凤凰绑定不受损，再官方导出、Core 回归与 Windows 实测。继续补密眼白/轮廓网格和闭眼弧线，勿重做已有绑定。

## imagegen 提示词全文

使用内置工具，唯一输入为用户新 PNG，transparent_background=true。

Use case: background-extraction. Asset: one precisely source-faithful screen-LEFT cheek/back hair layer for a Live2D Changli desktop pet. The attached 1254x1254 original is the sole identity, silhouette, color, scale and registration authority. Extract only the screen-left lower side/back hair visible beside her left cheek, roughly x10..415 y565..925: the small wispy white-tipped curls near x60..280 y675..818 and the narrow tapered coral/red back strands descending diagonally behind the mouse/hand near x10..225 y800..925. Keep the ORIGINAL thin, flat, tapered silhouette and ORIGINAL number of curls; no new rounded fluffy red/white curl mass or extra fan at lower left, no white dangling curl below y925, no giant crown or fringe. Preserve exact contour, burgundy lineweight, coral-to-cream coloring and original size/location on the SAME1254x1254 canvas, do not rescale/center/rotate. Include only a tiny concealed attachment behind the existing cheek where essential. Exclude face, eyes, earrings, gold butterfly, black tassel, crown, upper sweeping bang, hand, cuff, mouse, desk, keyboard, phoenix, symbols and background. Anything outside this single slender cheek/back hair bundle must be genuinely alpha transparent. Do not flatten the source head tilt or redesign the character. The output will be calibrated natively against the original; faithful extraction over prettifying.
> 历史 v1：左闭眼浅弧试作已制作并真实 Core PASS，右眼试验残留已恢复。续接 `../ChangliEyeArcAuthoring-v1-candidate.cmo3`，摘要 `0FB6A82EBE0ADB22DCB8BF9B2ADF067804CFA62346E040E32667B36F64BCD857`。左发/下脸/嘴源仍隐藏、尚未描边修正；闭眼位置与线条仍需精修。详见 [最新进度](../../../PROGRESS-CHECKPOINT-20261002.md)，下方权限/截图阻塞及细分源描述为历史。
