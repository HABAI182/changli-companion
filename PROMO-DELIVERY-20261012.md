# 离火长明 · B站宣传素材交付

2026-10-12 已完成45秒演示成片：横屏1920×1080、竖屏1080×1920，各60fps；有章节字幕与无章节字幕母版。H.264 High / yuv420p / Rec.709有限范围，AAC 48kHz立体声。正文字幕不会遮住长离的脸或手，设置和菜单阶段留出独立展示区域。

画面来自本项目0.7.12实际运行的Live2D模型和React设置界面，用浏览器回放真实界面操作后逐帧编码。用户明确同意此方案。画面保留“浏览器预览演示”标注，未将其当成Windows EXE录屏；没有使用文生视频接口或生成虚假的托盘、穿透、全屏避让演示。模型和精细美术完成度仍以桌宠交付说明为准。

本机素材目录：deliveries/media-20261012-v0712。主片wide-bilibili.mp4，竖屏版vertical-bilibili.mp4；母版wide-master.mp4与vertical-master.mp4。封面有1200×900与1920×1080两版，使用实际角色画面及HTML/CSS排版，未重新绘制角色。BGM为本地原创92BPM旋律与加法合成，不含既有歌曲、游戏原声或参考作者音乐采样，源码make_music.py与BGM-SOURCE.json记录来源。

标题、简介、备选标题、标签、置顶评论与文件选择说明见tools/promo/BILIBILI-POST.md，素材包内也有副本。主片推荐标题：“把长离请到桌面上！Q版 Live2D 桌宠免费公测｜离火长明”。

验证：两条成片完整解码，各2700帧、45秒，抽样动态帧有变化；逐段查看了键盘反馈、困倦/冒火、菜单、深色设置及片尾，未见角色裁切或字幕覆盖；编码、音轨与文件SHA256记录在MEDIA-VERIFICATION.json。只完成本机素材制作，未自动向B站投稿、发布评论或上传视频。

重现流程：安装imageio-ffmpeg 0.6.0，启动本工程Vite；依次运行tools/promo/make_music.py、render_promo.cjs（横屏及--vertical）、finalize_media.cjs。依赖Playwright与Windows微软雅黑字体，本机路径在脚本中明确指定。不要把2fps的sample文件用于正式投稿。最终稿已保存后重新制作须使用新的素材目录，避免覆盖交付文件。
