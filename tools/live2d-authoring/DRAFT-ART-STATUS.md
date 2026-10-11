> 最新续接（2026-09-29）：双侧发已在 `ChangliSideHairAuthoring.cmo3` 绑定并正式导出，默认模型已更新；技术表情与渲染帧循环已复核。美术仍是可替换草稿，先读 `tools/live2d-authoring/HAIR-TAIL-PROGRESS.md` 顶部检查点，以下为历史记录。

## 2026-09-27 局部摆动与手部衔接最新检查点

本节优先于下方历史记录。当前项目目录没有 .git，项目未发现适用的 AGENTS.md；work 中第三方自动绑定仓库的 AGENTS.md 不适用于本项目。以文件时间、保存工程和实际运行验证判断进度。

- 续接工程：`tools/live2d-authoring/ChangliSecondaryAuthoring.cmo3`，在本机 Cubism Editor 5.3.04 保存并官方导出，不重新制作已有眼嘴/双手绑定。
- 导入四层 `ChangliSecondaryAdditionsDraft.psd`，包括补绘底图、呆毛、右侧垂饰、凤凰。原含手底图及旧底图隐藏，补绘底图顺序400，活动部件500；导出9个可见ArtMesh、30个参数、三张2048纹理，100%比例。
- 呆毛：ArtMesh4，旋转轴置于发根，ParamHairFront -1/0/1约±5.1°。右侧垂饰：ArtMesh3，OrnamentRightSwing轴置于挂点，ParamHairSide -1/0/1约±6°。凤凰：ArtMesh5，ParamPhoenixSway -30/0/30，整只轻移；不是尾羽/翅膀绑定。
- 双手按压关键点精修：上缘接近静止袖口连接点，下缘保留约9.2源像素按压。Core验证右手上缘偏移0.9995像素、左手0.8130像素，各只移动自己的ArtMesh0/1，归零后完全还原。仍须继续精修袖口形状、遮挡和颜色，不能称正式美术完成。
- SDK物理初稿由 `prepare_secondary_physics.py` 生成，三组独立二粒子摆动，AngleX仅为物理输入，没有完成头部转动。物理JSON未导入Editor，因此CMO3本身没有物理设置；运行包通过manifest附加真实Framework物理，不伪造MOC3。
- 实际固定60FPS/1200帧测试：物理只改变ArtMesh3/4/5，有释放后的回弹；稳定后最大残余顶点位移0.09298源像素。SDK粒子阈值留下呆毛参数约0.00517，不能宣称参数精确归零；验收要求画面残差小于0.25源像素且参数在窄容差内。
- 浏览器实际1.2秒输入动作、8秒采样：三输出均有正负变化，结束时三输出及AngleX归零。眼部透明度、嘴、双手原有绑定均通过。当前运行后的错误/警告为0；早期物理调试错误保留在浏览器历史日志中，不代表本次结果。
- `prepare_secondary_runtime.py` 同步到 `public/models/changli/live-secondary-draft/`。默认 `public/models/changli/model.json` 未切换，旧WholePose仅控制眼嘴，不启用旧Sway。
- 官方MOC3：20480字节，SHA256 `8CCC51130EC101347017F9C4811121F9C6740EA54668EEC00A8E1E7D0A98780A`；保存CMO3：13216420字节，SHA256 `BD8B0261497D980C8E27746ECF8FC1D0C17B27090419BA1791365F664E2D4B30`。备份 `build/ChangliSecondaryAuthoring-hand-anchor-20260927.cmo3`；衔接修正前导出 `build/editor-export-secondary-before-hand-anchor-20260927/`。
- 证据：`tools/live2d-authoring/build/secondary-browser-verification.json`、`secondary-preview-20260927.png`；预览 `/tools/live2d-authoring/secondary-preview.html`。本次53项测试通过，TypeScript检查及生产构建通过。没有重新打包Windows，没有该分支原生窗口视觉验收。

未完成及下一步：大部分刘海/侧发/后发、身体/键盘仍在单底图；左饰品未拆、凤凰尾羽/翅膀未拆。优先分离左右侧发与遮挡补绘，再建根部固定的局部变形及分组物理，随后凤凰尾羽。新素材均为AI提取/补绘草稿，有颜色漂移，不是官方或宇痕冫制作，尚未达到用户要求的正式精细风格。17个正式表情、完整动作、原生Windows视觉验收仍待完成。

> 2026-09-27 双手阶段最新记录（优先于下方历史记录）：图像工具额度阻塞已解除，已生成左手 v1、右手 v1/v2，仍是需要精修的拆分草稿。新增三层 PSD `ChangliHandAdditionsDraft.psd` 已导入独立 `ChangliHandsAuthoring.cmo3`，原双眼与嘴部绑定保留；新底图绘制顺序 400，旧含手底图隐藏。双手各自建立 `ParamHandLeftPress` / `ParamHandRightPress` 的 -30/0/30 关键点（0 为静止，30 为按压，-30 与静止相同）。编辑器中校准手部位置/大小并保存，两张 2048 纹理保持 100% 比例。
>
> 官方导出 `build/editor-export-hands-20260927/ChangliHands.moc3` 18880 字节，SHA256 `0EFDDF7A24E60F11140CC6DAE6B0AC37A99CBE7D18BB4288F8EE80D84A460F88`；保存的 CMO3 SHA256 `FED99B3C9ABACEC47FC9F529F347B73A0791D23DD736B5E33F47768C9D772321`，另备份为 `build/ChangliHandsAuthoring-exported-20260927.cmo3`。运行资源位于 `public/models/changli/live-hands-draft/`，可用 `prepare_hands_runtime.py` 重建；新增 LeftPress/RightPress 两段临时参数动作，不合成 MOC3。
>
> 实际 Core 验证 6 个 ArtMesh / 29 个参数。右手只移动 ArtMesh0，左手只移动 ArtMesh1，均恢复初始顶点；底图/键盘、另一只手、眼嘴保持不动。双眼透明度和 Mouth 单网格变化通过。浏览器动作采样左/右分别达到约 29.318，另一手始终 0，最终双手归零。证据在 `build/hands-browser-verification.json` 和 `build/hands-preview-20260927.png`，预览 `/tools/live2d-authoring/hands-preview.html`。本次 53 项测试及生产构建通过。
>
> 尚未完工：左右手形状/袖口衔接、底图颜色漂移仍需精修；头发、饰品、凤凰、角色/键盘仍未完整分层，缺局部物理、正式表情与动作。新底图及双手暂在 Root，旧 WholePose 只控制眼嘴，故本分支禁用整体摆动，不能照搬旧 Sway。29 个参数不代表全部有效。默认桌宠仍使用旧模型；本次没有原生 Windows 模型视觉验收或重新打包。不要重复制作嘴部、双眼、双手关键点；继续从该独立 CMO3 分层精修。

# 手部拆分草稿 · 2026-09-26

> 2026-09-27 续接更新：下方“未保存的 Editor 操作”和截图阻塞是历史情况。当前已重新打开较新的已保存工程，确认 MouthOpen 与三个关键点存在，完成闭嘴/半开/全开曲面并保存导出。当前 CMO3 SHA256 为 D02125E64C6F17540FAF372F0C1353532FF9B6BE37A947FD8C040FBC4600CEE2；官方 MOC3 为 FEF06880BBEF6B3BBCFB630E51FAC250FCC5A77D60AC7B10C09601851C792BA7。Core 与浏览器验证通过，详细见 README.md 和 build/editor-verification.json。不要重复制作第 4 步嘴部绑定。截图保存时曾短暂失败，刷新窗口后已恢复；左右手素材仍未产出，先前图像额度错误仍未解决。

## 本次已完成

- 内置 image_gen 生成 `assets/no-hands-underpaint-v1.png`，1254×1254，RGBA，真实透明通道。移除了两只手及袖口，补绘肩部/衣服与键盘、鼠标后沿。已视觉检查整体角色构图仍贴近输入；不是逐像素一致的正式修复稿。
- `ChangliHandsDraft.psd` 单独打包该底图和原 PSD 已有眼睛/嘴层，保留画布与各层位置。仍只有四层，缺两只手，不能当作完整桌宠使用。
- 只读像素对比（排除两处手部编辑矩形、只比较两图都不透明的位置）：RGB 平均绝对差约 4.972 / 255；约 20.99% 像素至少一个通道差值超过 8。说明生成图存在编辑区之外的颜色/轮廓漂移，需要精修注册和局部修复，不能宣称像素保真或直接替换。
- 已保留 `build/ChangliCandidateLayers-before-mouth.cmo3`，备份本次操作前的现有工程。原 PSD、已导出 MOC3 和默认模型未被草稿替换。
- 磁盘当前 CMO3 与操作前备份 SHA256 一致：`6BE24DA7B526AA266FF9FBCBE5B5FAB88C9EAC7C41F096FAAE8ACBD97D83858B`。本次没有新的嘴部 MOC3 成果，不需要把旧构建或旧浏览器测试重复标成嘴部验收。

## 未保存的 Editor 操作

本次打开现有 CMO3，建立 MouthOpen 曲面变形器（位于 WholePose 下，只包含 Mouth），添加 ParamMouthOpenY 的 0 / 0.5 / 1 关键点。首次拖动闭合形态时截图失败，重新选择窗口后仍失败，未能确认拖动结果，也没有保存/导出。磁盘 CMO3 仍是修改前状态。若 Editor 仍打开，应先检查未保存状态，不要把三点已添加等同于嘴形已完成。

## 当前工具阻塞

- 本机编辑器截图两次返回 `encode latest capture frame failed: window crop is outside captured monitor`，停止使用旧坐标操作。恢复窗口到屏幕内可见状态后才能继续核对、保存和导出。
- 左手提取调用失败：内置图像工具返回 `usage_limit_reached`。没有产出左手或右手文件，没有改用 CLI / API。CLI 备选需要用户明确选择且本机配置 OPENAI_API_KEY。

## 接着做

1. 提取左右手与袖口独立图层，维持 1254×1254 画布注册位置。与补绘底图叠合检查接缝、重复手轮廓和袖口连接，必要时补绘修正。
2. 将通过检查的手部草稿单独导入工程；保留旧模型备份，避免重复导入旧 PSD。
3. 为左右手分别绑定输入参数；接键盘/鼠标动作前验证只移动对应手部、键盘保持不动。当前整体轻摆不是手部动作。
4. 检查 MouthOpen 未保存状态，制作真实闭合/中间/张开曲面，导出后扩展 verify-editor-model.js 检查仅 Mouth 的顶点变化。
5. 独立头发、发饰、凤凰、键盘及正式表情仍需继续分层。此草稿不代表达到宇痕冫成品风格。

## 保存的生成提示词

工具：内置 image_gen；未使用 CLI。编辑输入：`build/closed-plate.png`。

### 补绘底图（生成成功）

Use case: precise-object-edit. Asset type: Live2D underpaint candidate for splitting independent hands. Input image is the EDIT TARGET, not just a style reference. Keep the same square canvas, composition, character identity, closed eyes, pink coral hair with white tips, black/gold ornaments, outfit, small phoenix, keyboard and mouse. Remove ONLY both round pale hands and the black/red cuffs surrounding those hands at the bottom of the face (left hand above mouse, right hand above keyboard). Reconstruct the small hidden continuation of the shoulders/outfit and the rear edge of the keyboard/mouse where hands used to be so later separate hand layers can move without revealing duplicate hands. Do not change the rest of the artwork, do not add new props, do not redraw face or eyes, do not add mouth. Maintain genuine transparent background, no black background, no checkerboard baked in. Match existing line weight, cel shading and colors precisely. This is technical underpainting, not a new illustration. Preserve all unedited details as closely as possible.

### 左手提取（额度耗尽，未生成）

Use case: background-extraction. Asset type: one isolated Live2D hand layer. Input is the EDIT TARGET. Output on EXACT SAME 1254x1254 transparent canvas, preserving coordinate registration. Keep ONLY the screen-left pale round mitten-like hand and its black/red sleeve cuff directly above the mouse, approximately x=190..415 y=790..957. Preserve this hand's original size, position, shape, colors, black outlines and cuff from the input. Remove everything else completely to transparent: all head, hair, face, eyes, body, ornaments, keyboard, mouse, wire, phoenix. Do not center, enlarge, move, add anything, or redraw hand pose. Need the hand AND its attached cuff as one isolated layer for subtle keyboard/mouse movement. Actual alpha transparency, not black or checkerboard background. No text. Faithful extraction of the original hand.
