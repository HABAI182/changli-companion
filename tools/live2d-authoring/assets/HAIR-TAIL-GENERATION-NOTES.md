# 发束、尾羽与袖口素材施工记录 · 2026-09-29

2026-09-29 凤凰翅膀 v2：从原凤凰身体图再生成较小的透明翅膀 `phoenix-wing-v2-candidate.png`，约 `(962,984)..(1169,1125)`；`package_phoenix_wing_v2_layers.py` 将其与现有去翅膀身体候选打成 `ChangliPhoenixWingDraft-v2.psd`。PSD 像素往返校验通过，已替换重导入隔离 Cubism 候选，未进入默认模型。翅根与身体色块、旧图遮挡接缝仍需手工校正；不得把它当作正式分层美术或宇痕冫作品。

2026-09-28 左饰品隔离稿 `ornament-left-v1-candidate.png` 尺寸约为原位置的 1.5 倍；去饰品底绘 `underpaint-no-left-ornament-v1-candidate.png` 连脸、键盘、右饰品也发生非局部变化。两稿均未导入 Cubism，也不应直接替换底绘。后续应按用户提供造型与官方参考核对每一处尺寸、颜色、线条，再把合格的分层稿纳入源工程；不能称草稿为宇痕冫作品。

2026-09-29 再次尝试从 `hair-underpaint-v1.png` 只抹除左饰品，视觉变化更局部，但与原图比对的差异框延伸至 `(0,21,1224,1254)`，画布远端示例像素也改变，仍未导入。另用内置 image_gen 从 `phoenix-body-v1.png` 隔离右侧翅膀并补绘去翅膀身体，输出相对原位放大，且补绘有非局部色差。两张凤凰图作为明确标注的候选复制到 `phoenix-wing-v1-candidate.png`、`phoenix-body-no-wing-v1-candidate.png`，已导入隔离的 `ChangliPhoenixWingAuthoring.cmo3`，经编辑器缩小对齐后仍隐藏；未进入默认模型。源 PSD 在 `ChangliPhoenixWingDraft.psd`，可用 `package_phoenix_wing_layers.py` 重建。

使用内置 image_gen，输出均已复制到本目录。生成结果仅是待校准候选，不是官方或宇痕冫作品。发束轮廓和原位置未严格保持；尾羽 v1 夹带翅膀，v2 已清除该部分并在官方模型中替换。双袖口候选已导入校准并绑定按压，其余完整发束候选保持隐藏；不可称正式美术完成。原运行模型保留。PSD包装不绘制或重采样，只裁透明边缘并设置初始偏移；已检查透明通道与保存后像素往返一致性。

## hairPrompt

Use case: background-extraction. Asset: Live2D right side-hair layer. EDIT TARGET is attached secondary underpaint. Isolate ONLY the complete screen-right side hair from beside the cheek down to white-tipped curled ends, approximately x840..1240 y480..976. Include the pink outside locks, white lower ends and intact narrow upper root for hanging attachment. Do not include gold butterflies, accessories, face, eyelids, clothing, keyboard, mouse or any left hair. Keep EXACT existing coral pink/white colors, highlights, dark outlines, strand silhouette and all layer contents in original coordinates on 1254x1254 canvas. Do not enlarge, recenter, redesign or color grade. Fill only small hidden root behind face where needed for Live2D rotation with matching hair. Actual transparent alpha outside hair. One connected right-side bundle, delicate cute chibi drawing preserving the supplied Changli identity.

## hairLeftPrompt

Use case: background-extraction. Asset: Live2D screen-left complete side hair. EDIT TARGET attached Changli no-hands secondary base. Extract ONLY the screen-left side hair bundle including pink outer layers from x100,y460 down to white tips near x400,y890 and the lower back pink locks ending x5,y940. Preserve exact original coral-to-white gradient, highlights, dark outlines, curls, and strand count. Include narrow hidden root behind cheek, no face, eyelids, gold/black ornaments, clothing, hands, keyboard or mouse. Keep size and location on same1254x1254 transparent canvas; no centering, enlargement, redesign or color grading. Clean genuine alpha, one complete hair bundle.

## hairFrontPrompt

Use case: background-extraction. EDIT TARGET attached Changli base. Extract ONLY the central front bangs (pink/coral hair from crown split near x660,y220 across forehead, ending in tapered points near x490..845,y740). No side hair, face, eyebrow/eyelids, ears, accessories, torso or keyboard. Preserve exact asymmetric central pointed lock, overlapping narrow locks, white highlights, coral shading and burgundy linework. Keep original silhouette and location, same1254x1254 RGBA genuine transparent canvas; do not enlarge or recenter or redesign. Narrow concealed root 10pixels beyond visible boundary for deformation. This is a single front-bangs sheet for later subdivision in Cubism, not new hairstyle.

## hairUnderpaintPrompt

Use case: precise-object-edit. Input1 EDIT TARGET current Changli secondary underpaint. Input2 original color reference only. Create underpaint for independently moving side-hair bundles: remove ONLY the two side-hair bundles below the temples (screen-left x0..415 y480..947 and screen-right x845..1238 y480..970). Keep upper crown and front bangs exactly unchanged. Repair the small hidden skin ear/neck/body contours behind removed hair; outside head/body leave transparent. Keep both gold butterflies and left dangling ornaments in original coordinates; right dangling ornament absent as in target. Keep face closed eyelids, mouth, clothing, mouse/keyboard exactposition/scale. No hands, phoenix or ahoge. Preserve current cel artwork but correct remaining pink hair slightly toward original warm coral salmon reference, avoid saturated red drift; no other palette changes. Exact1254x1254 RGBA transparent canvas; no recenter/enlarge/redesign. New layer will go UNDER separate side hair, face contour must stay original.

## tailPrompt

Use case: background-extraction. EDIT TARGET attached phoenix. Isolate only the complete screen-right red/gold tail fan behind the bird, from attachment at x1040,y1000 through gold-red pointed feathers x1100..1240 y880..1150. Include overlapping hidden narrow tail root so it can move behind body, preserve exact colors dark outline and existing fan silhouette. NO bird body, face, wing, feet or overhead flame. Exact 1254x1254 RGBA transparent canvas, original placement and size; no redesign, recentering or enlargement. Live2D independently swinging tail asset. Keep every tail feather, cream/gold flame-shaped inlays and maroon lower feather.

## phoenixBodyPrompt

Use case: precise-object-edit. EDIT TARGET attached phoenix. Remove ONLY the tall red/gold tail fan behind the screen-right wing plus maroon trailing feather. KEEP complete cream round smiling bird body, closed eyes, beak, both red wings, feet, top crest and floating flame exactly unchanged. Repair tiny hidden cream body contour behind tail attachment; surrounding area transparent. Same1254x1254 RGBA canvas, bird original size and position, no recenter or enlarge. Preserve original cel shading, colors, contours. This is the body underpaint for a separate moving tail layer. No new bird pose, tail, scenery, shadow or background.

## cuffPrompt

Use case: precise-object-edit. Input1 EDIT TARGET isolated right hand/cuff; Input2 color and shape reference supplied Changli illustration, never include rest of reference. Refine only the one hand+cuff: correct sleeve to reference matte charcoal with thin coral-red piping rather than shiny rounded dark tube; warm ivory hand with restrained coral rim shadow and original three rounded mitten scallops. Match flat cel shading and narrow line weights to reference. Extend narrow sleeve root 12 pixels upward behind cuff for overlap with body and eliminate floating cuff seam; keep all visible hand contour, size, placement unchanged. Do not add fingers or arm outside cuff. Same1254x1254 RGBA canvas genuine transparency, object bbox roughly692..974 y938..1104. Do not recenter, enlarge, color grade entire canvas, add black background, text or other elements. Return one refined layer only.

## cuffLeftPrompt

Use case: precise-object-edit. Input1 EDIT TARGET isolated left hand and cuff, Input2 color/shape reference only. Refine left sleeve connection by extending narrow charcoal sleeve root 12pixels upward behind cuff, hide root under body in Live2D. Preserve left cuff white band and coral-red piping, warm ivory round mitten with three little scallops. Correct highlights to restrained flat cel shading matching reference; no glossy tubular cuff. Keep exact original contour and placement at x218..462 y903..1061 on1254x1254 transparent canvas. Change only root overlap and shading, no recenter, enlargement, extra fingers, arm, mouse, keyboard or other reference content. Genuine alpha transparency everywhere outside one hand and cuff.

## Tail v2 cleanup

Built-in imagegen edit, saved as `phoenix-tail-v2.png`. Source `phoenix-tail-v1.png`; output `exec-e8b103c7-c5cf-4674-be58-3081c544acb7.png`. Visual inspection: foreground crescent wing and orange body remnant removed, rear fan retained. Candidate art, not final approved art. Must reimport and verify before describing runtime as v2.

Prompt: Edit target: the supplied transparent 1254 x 1254 Phoenix tail layer. Make ONE localized correction: remove the separate small forward-facing curled wing in the LOWER LEFT foreground of the visible feather cluster (the short crescent red feather with pale gold interior ending around x=1010,y=960). Remove also the orange oval body remnant directly below that wing. Reconstruct ONLY the big rear flame-shaped tail fan behind that removed foreground wing. Preserve the tall upward red/gold tail fan, its sweeping red silhouette, pale ivory/gold flame center, fine maroon outlines, and the small dusty rose rear tail tips at lower right. Preserve original tail fan placement, size, warm color palette and linework as exactly as possible. No bird body, no face, no wing, no new ornament. This is a Live2D detachable tail asset, with a connected short tail root at its lower-left attachment behind the bird. Keep genuine transparent alpha everywhere outside the tail. Do not center, enlarge, or redesign; leave all pixels in their original coordinate region at the lower right on the original 1254 square canvas. No labels, watermark, background, checkerboard drawing.
