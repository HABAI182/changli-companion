# 双手拆分草稿 · 2026-09-27

通过内置 image_gen 编辑图像生成，未使用 CLI 或独立 API。输入为用户提供角色图的既有闭眼底稿 `build/closed-plate.png`；结果不是官方或宇痕冫制作的模型，不能宣称具有相同完成度。

工具已恢复可用，本次生成 `hand-left-v1.png`、`hand-right-v1.png` 和 `hand-right-v2.png`，均为 1254×1254 RGBA 真透明图。右手 v2 的位置修正仍未严格符合提示，因此素材保持 draft。包装脚本只提取已有像素并设置 PSD 层偏移，未重绘或缩放图像；最终大小校准在 Cubism Editor 网格中完成。

## 左手提示

Use case: background-extraction. Asset type: registered Live2D screen-left hand and sleeve layer. Input is the EDIT TARGET. Keep ONLY the screen-left pale rounded mitten hand AND attached black/red/white sleeve cuff above the mouse, approximately x=190..415 y=790..957. EXACT same 1254x1254 canvas, same position and size. Preserve the original illustration outline, shading, hand shape and cuff faithfully. Everything else completely transparent including mouse, face, hair, keyboard, body and phoenix. Do not center or enlarge the hand. No redesign, no added arm, no text. Genuine alpha transparency.

## 右手提示

Use case: background-extraction. Asset type: registered Live2D screen-right hand and sleeve layer. Input is the EDIT TARGET. Keep ONLY the screen-right pale rounded mitten hand AND attached black/red sleeve cuff resting above the keyboard, approximately x=655..895 y=831..955. EXACT same square 1254x1254 canvas, same position and size, no centering or enlarging. Preserve original hand, dark outlines, red highlights and sleeve faithfully. Everything else completely transparent including face, hair, body, keyboard and phoenix. No redesign, no added arm, no text. Genuine alpha transparency.

## 右手修正提示

Use case: precise-object-edit. Image 1 is EDIT TARGET: isolated right hand. Image 2 is exact registration reference, do NOT include it in output. Correct ONLY scale and position of image 1 so hand and cuff align exactly with the screen-right hand in image 2 over keyboard. Current extracted object is too large and too low. On unchanged 1254x1254 canvas, the complete opaque hand+cuff must fit x=660..890 and y=837..951, NOT y=944..1108. Preserve pale mitten shape, dark sleeve, original red accents and shading; no new fingers, no surrounding artwork. Everything outside that one hand+cuff genuinely transparent. No stray faint pixels elsewhere. Do not center.

校准前 alpha≥8 区域：左手 (218,903,462,1061)，右手 v2 (692,950,974,1104)。PSD 位置分别设为 (190,800) 与 (660,835)，只提供导入初始位置，不等同于最终美术注册。整体补绘底图还存在色彩漂移，详见 DRAFT-ART-STATUS.md。
