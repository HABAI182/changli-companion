# 圆角长离图标制作记录

- 模式：imagegen skill，内置 image_gen 编辑，透明背景；没有使用付费 API CLI。
- 输入：用户提供的完整角色原图，项目保留副本 public/assets/changli-icon-v079.jpg。
- 项目输出：public/assets/changli-icon-v0810.png；复制为 src-tauri/icons/icon-source.png，再使用 Tauri icon 转换生成 Windows ICO 与各尺寸图标。
- 保留同一长离造型；圆角方形珊瑚外框、奶油内底与细金色轮廓增加几何感。角外为透明 alpha。没有把灯具或新人物替换原角色。

实际编辑提示词：

> EDIT the supplied original illustration into a polished Windows application icon, not a new character. Keep the recognizable SAME chibi Changli portrait, coral pink hair with white curled tips, thin looping cowlick, gold-black twin butterfly ornaments, huge red-gold flower irises, paw-like hands, keyboard, mouse and small round phoenix. Preserve the original sweet face and eye balance, art rendering and overall composition as closely as possible. The requested change is a tasteful rounded-square icon with a modest geometric logo feeling: smooth superellipse rounded corners about 22% radius, flat warm cream inset field, a clean coral-pink geometric rim and one very restrained gold contour accent. Simplify ONLY surrounding framing and background, do not vectorize or redesign the character. Keep the figure comfortably inside the rounded container with safe margins, make the face prominent, keyboard and phoenix still visible. Outside the rounded square must be truly transparent alpha, no solid rectangular canvas behind corners. Crisp flat graphic geometry, balanced proportions, restrained premium iOS/Windows 11 icon aesthetics. No words, letters, watermark, extra symbols or objects, no new lantern, no 3D bevel, no sparkles, no heavy shadow or glow. Square icon filling 94% of square canvas, fully visible corners.

AI 编辑可能有局部细节变化，不能称原图无损转换。0.7.9 原图图标仍在旧版留档中。
