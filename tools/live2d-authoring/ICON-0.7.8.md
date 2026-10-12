# 长离头像图标 0.7.8

使用 imagegen skill 的内置 image_gen 工具生成，参考用户提供的桌宠原图。保留珊瑚粉白渐变头发、呆毛、金黑发饰和红金花瞳；不是官方新增素材，也不是直接裁剪原图。透明背景保留生成的 alpha。

项目图片：`public/assets/changli-icon-v078.png`，1280×1280。
Windows 图标源：`src-tauri/icons/icon-source.png`；通过 Tauri icon CLI 转为多尺寸 ICO。应用、设置头像与浏览器入口共用此图样。

参考原图（本地制作资料）：`tools/live2d-authoring/references/changli-original-current.png`。

生成提示词：

> Use the supplied reference as character identity and color reference. Create ONE polished cute Windows application icon of the SAME chibi Changli (Wuthering Waves), a compact head portrait only, isolated on a truly transparent background. It must look recognizably like THIS reference, not a generic pink-haired girl. Keep the distinctive coral-pink voluminous layered fringe with white curled hair tips, thin loop-shaped cowlick at top, twin dark hair ornaments with elegant gold butterfly/three-loop frames and small dangling gold beads, huge warm crimson-to-gold eyes with pale gold flower-shaped pupils, tiny mouth and soft blush. Head gently tilted, charming open-eyed smile. Simplify the illustration into clean rounded confident contours and broad color shapes so it remains beautiful at 32 and 64 pixels, while retaining those character identifiers. Hair silhouette full and rounded, face round, balanced eyes looking at viewer; no crossed eyes. Soft cel shading, tasteful cream highlights, no text, no watermarks, no keyboard, mouse, hands, body, extra characters, flames, drop shadow, badge, or background square. Fill about 88% of a square canvas with a centered complete silhouette, with safe padding and no clipped hair/ornaments. Reference composition is only for identity, this is a NEW app icon, not a whole-scene redraw.
