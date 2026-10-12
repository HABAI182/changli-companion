# 0.7.8 完整底层与脸部衔接修正

修正手移开后底层缺口、键盘手上方下颌补片生硬及图标不像长离的问题。

- 完整鼠标外壳、按钮和线缆位于手掌下层，不再用手形挖洞；鼠标与右手继续联动，键盘保持固定。
- 原生完整袖口先绘于大头后方，干净的手掌与袖口前缘再绘于胸部、鼠标和键盘上方。新增连续衣料底层随头部原生三角形变形，补足旧裁切暴露的区域。
- 下颌补片改为采样原脸纹理，柔化上方和左侧接缝，轮廓独立补绘；绑定原生脸部位置，随转头和弹性运动。
- 图标改为参考桌宠原图生成的长离头像，保留粉白头发、金黑发饰、花瞳和呆毛。Windows ICO、设置头像与预览入口同步替换。[生成记录](tools/live2d-authoring/ICON-0.7.8.md)。

类型检查与实际 App WebGL 单项核对：四区 Q/A/U/H、手掌遮挡顺序、完整鼠标底层、鼠标按下和转头；深浅背景截图已核对，无页面错误。只检查本次变更，没有重复完整旧功能测试。

Windows EXE 与 NSIS 安装包构建成功，独立副本及 SHA256 已保存。新版便携 EXE 实机启动、透明 Live2D 画面、设置已加载状态及标题栏/设置头像已核对；本次手移开细节由 WebGL 截图核对，未将短按键后的静止画面当作新的全局输入验收。安装卸载和多屏/DPI 未重复验收。浏览器结果不算 Windows 验收。

独立交付目录：`deliveries/20261012-desktop-0.7.8/`；GitHub：<https://github.com/HABAI182/changli-companion/releases/tag/v0.7.8>。旧版本和附件不覆盖。

CMO3/MOC3 仍为已验证 v71，本次修正位于运行层，没有新的 Cubism 导出。`formalArtComplete=false`；原生精细美术和多屏/DPI 验收尚未全部完成，本版为工程预发布。

单项证据：`tools/live2d-authoring/build/interactions-0.7.8-20261012/verification.json`。完整恢复指针：`tools/live2d-authoring/build/current-release/LATEST-RECOVERY.json`。
