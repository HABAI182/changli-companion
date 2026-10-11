# 局部动态拆分素材记录 · 2026-09-27

这些是参考现有长离底图生成的可替换草稿，不是官方素材或宇痕冫作品。透明1254×1254画布；生成结果没有准确遵循原位置/比例，已在Editor人工缩放、定位和设置旋转挂点。补绘存在颜色漂移，须继续精修。

| 输出 | 用途 | 生成记录 |
|---|---|---|
| phoenix-v1.png | 整只凤凰及火焰 | exec-ec3ec499-24b9-40fb-943c-0ebdf96c4071 |
| secondary-underpaint-v1.png | 去凤凰和呆毛补绘 | exec-87de3132-4b34-4091-a6ed-b0841f1b25cc |
| ahoge-v1.png | 独立呆毛 | exec-416b9319-4f50-414a-a729-1635125a56fe |
| ornament-right-v1.png | 右侧垂饰 | exec-4b28332f-f251-485e-8bba-f788ebaf7d71 |
| secondary-underpaint-v2.png | 再去右垂饰补绘 | exec-eddf129c-350c-4798-91da-dae8d9899a82 |

生成原始文件位于 `C:/Users/18769/.codex/generated_images/01a0d103-6dcf-7963-912d-a6a39531c986/`。仅用图像工具编辑，PSD打包脚本裁透明边缘，不绘制或重采样图像。四层PSD及包装清单由 `package_secondary_layers.py` 生成；最终摆放以保存的CMO3为准。

## 凤凰提取提示

Use case: background-extraction. EDIT TARGET is the attached Changli layer. Create ONE isolated Live2D phoenix layer: keep only the complete cream/red chubby phoenix at bottom right, including the floating little flame above its head and full red tail. Preserve exact original drawing, pose, closed smiling eyes, dark outlines and cel shading. Same 1254x1254 transparent canvas and original approximate bounding box x1020..1254 y748..971, do not recenter or enlarge. Remove every other element including hair, body, keyboard and mouse. Genuine alpha, no ghost pixels. Do not redesign.

## 底图第一次补绘提示

Use case: precise-object-edit. EDIT TARGET attached no-hands Changli base. Remove ONLY (1) bottom-right phoenix including floating flame and tail, and (2) the single loop-shaped ahoge strand at very top x650..890 y120..255. Under phoenix restore hidden right hair ends behind it naturally in original pink-to-white colors; outside hair leave transparent. Under ahoge preserve and restore smooth crown boundary. Keep ALL face, hair except ahoge, closed eyelids, mouth, gold accessories, body, keyboard and mouse exactly same position/scale/colors. Do not add hands. Exact1254x1254 RGBA transparent canvas. This is an underpaint for separated moving layers. Restrained repair only; no redesign or color grading.

## 呆毛提示

Use case: background-extraction. Attached image is EDIT TARGET. Isolate ONLY the single loop-shaped pink ahoge strand at very top of Changli head (approximately x650..890 y120..255). Keep its exact tapered curved silhouette, original red outline, pink highlights, and short narrow root extending down to meet crown. No other hair, face, accessory, character, keyboard or bird. Same square 1254x1254 canvas, original position and original small scale, do not enlarge or center. Genuine transparent alpha everywhere outside the strand. This will be one independent Live2D spring hair layer; avoid noise or extra fragments.

## 右垂饰提示

Use case: background-extraction. EDIT TARGET attached Changli base. Isolate ONLY the screen-right hanging hair ornament BELOW the gold butterfly: the elongated gold-black oval pendant, small beads and round gold bead, and black tassel with red highlight plus short gold ribbon end. Approx x966..1145 y455..738. Do not include butterfly itself, hair or face. Preserve original shapes and dark outlines, color/shading. Keep original placement and scale on exact square1254x1254 transparent canvas; no recentering or enlargement. Genuine alpha everywhere else; no noisy ghost fragments. One connected hanging accessory layer for gentle Live2D pendulum motion.

## 底图第二次补绘提示

Use case: precise-object-edit. EDIT TARGET attached secondary-underpaint-v1. Remove ONLY screen-right dangling gold-black oval pendant below butterfly, its small beads/round gold bead, black/red tassel and short gold ribbon end (approx x966..1145 y455..738). Keep large butterfly attached to hair untouched. Restore the hair previously obscured by pendant and tassel using exact neighboring coral pink and white hair shading/strand direction, maintain consistent dark outlines. No phoenix, no ahoge, no hands added. Everything else including face/closed eyelids/mouth, clothing, left ornaments, mouse/keyboard, full1254x1254 canvas and character scale stays unchanged. Genuine existing transparency preserved. Minimal local repair, no color grading.
