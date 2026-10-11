> 最新续接（2026-10-01）：默认已接中央刘海/左饰品和九组SDK物理；Windows真实Cubism加载故障已修复并实机观察成功。双眼闭合曲面另存并官方导出，Core独立形变/插值/原绑定回归和实际眨眼通过，但中间帧有重影，隔离候选未切默认。复现 `prepare_left_ornament_runtime.py` / `prepare_eye_deform_runtime.py`，核对 `left-ornament-v1-preview.html` / `eye-deform-v1-preview.html`。留边已修正为SDK小写字段，原生新包复核进行中。59项测试通过；完整精细美术仍未完工。先读 [HAIR-TAIL-PROGRESS.md](HAIR-TAIL-PROGRESS.md) 顶部，以下保留历史。

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

# 长离 Cubism 技术候选模型

> 2026-09-27：已核对此前保存的 MouthOpen 曲面和三个关键点，完成闭嘴/半开/全开技术形态，保存并由官方 Editor 导出。嘴部 Core 检查及 Blink / Sway / Mouth 浏览器采样均通过。新 `ChangliHandsDraft.psd` 和 `assets/no-hands-underpaint-v1.png` 仍是缺左右手的独立草稿，进度见 [DRAFT-ART-STATUS.md](DRAFT-ART-STATUS.md)。

## 2026-09-26 当前进度：可编辑的官方 Editor 工程

- `ChangliCandidateLayers.psd`：四层、保留透明度和画布位置的 PSD。由 `export_psd.py` 打包已有主体、眼睛和嘴素材；不是重新绘制的正式分层美术。
- `ChangliCandidateLayers.cmo3`：已在本机 Cubism Editor 5.3.04 打开、编辑及保存。四个 ArtMesh 的共同父级为 `WholePose` 旋转变形器。
- 实际绑定：`ParamEyeLOpen`、`ParamEyeROpen` 的 0/1 透明度关键形态；`ParamAngleZ` 的 -30/0/30 对应整体 -2°/0°/2°；`ParamMouthOpenY` 的 0/0.5/1 对应压扁的闭嘴/半开/原图张嘴，MouthOpen 曲面只包含 Mouth。工程中的其他标准参数存在不代表已制作。
- `build/editor-export/`：官方 Editor 导出的 MOC3、2048 贴图和显示信息；MOC3 当前 17024 字节。最新独立导出留存在 `build/editor-export-mouth-20260927/`，此前导出备份在 `build/editor-export-before-mouth-20260927/`，此次修改前的 CMO3 备份为 `build/ChangliCandidateLayers-resumed-20260927.cmo3`。
- `public/models/changli/live-editor/`：相同官方模型及三段临时参数动作 Blink / Sway / Mouth。运行 `prepare_editor_runtime.py` 从导出目录更新，并重新附加动作，避免手工复制时丢失动作清单。嘴部不是音频口型或精细唇齿绑定。
- 浏览器开发验证入口：`http://127.0.0.1:1420/tools/live2d-authoring/editor-preview.html`。包含眼睛、左右轻摆、短动作按钮，以及用官方 Core 读取实际透明度和网格坐标的独立关键形态检查。

本项目桌宠默认仍用下文 `live/` 技术候选模型；`live-editor/` 是继续制作与验证的官方工程分支，尚未作为默认桌宠模型。源 PSD 和 CMO3 不由生产网页加载。眼睛仍采用交叉淡化，整体旋转包含键盘；它们不是精细眼皮变形或独立头部运动。独立头发、发饰、双手、键盘、凤凰及完整表情/物理仍未制作，不能宣称达到宇痕冫的成品观感。

继续制作时直接打开当前 CMO3，保留现有三项绑定，不要再次导入同一 PSD 造成重叠 ArtMesh。修改后从 Editor 导出为 `build/editor-export/ChangliEditor.moc3`，再运行：

```powershell
python tools/live2d-authoring/prepare_editor_runtime.py
npx prettier public/models/changli/live-editor --write
```

## 早期实验性候选模型

`build_candidate.py` 从用户提供的透明长离图和一张可替换闭眼技术素材生成真正的 Cubism `.moc3`、贴图、4 个动作与 4 个表情。默认静止画面尽量保留原图。产物位于 `public/models/changli/live/`，`model.json` 已指向该目录。

使用带 `numpy`、`Pillow` 的 Python 运行：

```powershell
python tools/live2d-authoring/build_candidate.py
npx prettier public/models/changli/live --write
npm test
npm run build
```

脚本依赖 `vendor/` 中的实验性 MOC3 构建代码，其 MIT 许可见 `vendor/LICENSE`。运行时仍由官方 Cubism Core / Framework 绘制。`assets/closed-eyes-candidate.png` 是基于用户指定造型生成的闭眼技术图；`build/rest-composite.png`、`build/closed-plate.png` 仅用于检查，不是打包运行资源。

这是可以运行和替换的工程模型，而不是正式美术交付。它仅有主体、左眼、右眼、嘴四层；眨眼通过开放眼层透明度与闭眼底图交叉淡化，细看中间帧会有残影。身体和脸共用较粗网格，没有独立手部、发丝、发饰和凤凰物理。后续精细 Live2D 应从可编辑的原创分层源图重新绘制被遮挡区域并完整绑定，不要把当前贴图放大或细分网格当作正式模型。更换正式模型时更新 `model.json` 的 `renderer.live2d` 映射即可，业务状态机无需重写。
