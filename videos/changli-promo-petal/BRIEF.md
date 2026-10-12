---
workflow: product-launch-video
flow: automation
storyboard: no
mode: autonomous
destination: Bilibili
aspect: 1920x1080
alternate_aspect: 1080x1920
length: 45
language: zh-CN
narration: no
style_preset: capsule
message: "把会回应键鼠的小长离请到桌面"
angle: character-first real feature demonstration
---

## Intent
用户要求按照 PROMO-VIDEO-PROMPT.md 用 Hyperframes 生成 45 秒宣传视频，并完成封面、标题、简介。上一版不满意，本版需大字体、顺滑过渡、二次元年轻人的简约审美与吸引力。现有会话已授权真实浏览器 Live2D/设置演示素材及直接成片，继续自主完成。

## Assets
- 当前仓库运行中的原生模型 v71、真实互动菜单与设置界面；重新采集为透明素材
- 原原创 92 BPM BGM：deliveries/media-20261012-v0712/bgm-original-92bpm.wav
- 应用现有长离图标；不重画角色
- Noto Sans SC 开源字体和 OFL 许可

## Customizations
标题约 110–150 px（1080p），辅助文案约 38–44 px。一个连续角色画面跨场景；文字和几何背景按 0.4–0.6 秒错位接力过渡。横竖版分别构图。字幕版、无宣传字幕母版、封面和文案均单独保存。

## Notes
参考 https://www.bilibili.com/video/BV1AxK6zJEce/ 的公开预览分镜，观察到角色主导、真实模型操作与多表情演示；未完整播放其音视频，不宣称逐帧复刻节奏，不使用其画面/角色/音乐。
浏览器演示持续标注；不宣传本片未实录的 Windows 托盘/穿透等原生功能。Windows 与 macOS 均已独立发布，收尾正确指向项目下载页。
旧版保留于 deliveries/media-20261012-v0712，本版为独立 Hyperframes v2；最终导出已由用户明确要求，不再次请求确认。
Hyperframes 使用额度查询返回 unknown；HeyGen 未登录，使用已有原创 BGM 与本地渲染。
