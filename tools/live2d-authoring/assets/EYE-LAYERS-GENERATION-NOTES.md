# 眼部分层素材记录 · 2026-10-01

所有候选由内置 image_gen 编辑生成，仅是可替换草稿，不是官方或宇痕冫原作。没有使用 Python 绘画；PSD 包装只裁透明边缘、保持原像素并验证往返。共同参考为用户指定长离图和当前底绘。生成未能严格保持原画大小和位置，实际注册在 Cubism 中校准。

| 文件 | 生成输出 | 处理结果 |
| --- | --- | --- |
| eye-skin-underpaint-v1-candidate.png | exec-069fd9ae-e155-4334-a290-fa47fe2e101c.png | 只采用两处原生网格裁切肤色补绘；不整体替换 |
| eye-skin-patches-v1-candidate.png | exec-497071a6-e8a5-4211-9fca-2615a0cab634.png | 大椭圆、杂色和无关颊部痕迹，拒绝导入 |
| eye-upper-lashes-v1-candidate.png | exec-49260003-69a6-4254-a462-ec2b2d245b78.png | 尺寸和颜色不符，拒绝导入；沿用原轮廓反蒙版 |
| eye-irises-v1-candidate.png | exec-62cd853f-efd6-4a0f-be45-1141519af712.png | 导入 ArtMesh23/24，校准缩放、位置；未正式视觉验收 |
| eye-sclera-v1-candidate.png | exec-50848901-c325-4ab7-82f5-8247a4a23923.png | 导入 ArtMesh25/26，校准缩放、位置并作为眨眼蒙版 |

## 生成约束记录

- 底绘：编辑 `bang-underpaint-no-left-v2-candidate.png`，仅去除旧闭眼线和眼褶，保留脸、发型、衣服和键盘，1254 正方形透明画布。结果共同像素平均 RGB 差 4.075385/255，眼区之外 14.668436% 像素差超过 8；整图替换被拒绝。仅裁两眼补绘区域后采用，仍有接缝。
- 肤色补片：两个原位桃色皮肤补片、无眼鼻嘴和无其他角色内容；输出包含无关变化，拒绝。
- 上睫毛：仅抽取左眼约 x335..545/y598..660、右眼约 x668..854/y667..741，保留原轮廓和颜色；输出 1388×1133，与目标 1254×1254 不同，形态偏成大红色带，拒绝。
- 虹膜：珊瑚红至酒红、浅金四瓣花瞳纹和白高光，左中心约 (462,685)、右中心约 (735,744)，透明背景，不含眼白和皮肤；输出尺寸偏大，已原生校准。SHA256 `8434A9D8377271420C8F59E42B066E9FF620A0BBDA38574F807E7D57CF22F796`。
- 眼白：淡象牙色和克制上缘灰影，无虹膜/睫毛，左约 x355..534/y625..731、右约 x670..830/y690..795，原位置透明画布；输出已原生校准。SHA256 `AFAAFFFF7B8F8E4DB5AB4E7231EAF4F64EF511ED42EFBAB31EF4B2F0EA9D6D29`。

`package_eye_components.py` 包装四层到 `ChangliEyeComponentsDraft-v1.psd`。左右各自裁切透明边缘，不重采样；报告 `build/ChangliEyeComponentsDraft-v1-packaging.json`。技术分层、眨眼蒙版和视线已通过 Core，不意味着上述素材正式美术达标。
