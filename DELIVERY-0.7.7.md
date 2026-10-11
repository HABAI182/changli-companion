# 0.7.7 边缘修正

修复用户指出的鼠标手左缘残留和键盘手移开后露出的脸部缺角。

- 鼠标所在的旧前景图层含有静态手部残片，按 UV 范围剔除；保留实际按压手、鼠标和线缆运动，未裁伤手指。
- 重建原生下颌 ArtMesh29 被旧键盘袖口遮挡的局部轮廓，补片逐点绑定原生 UV 三角形，随转头和弹性变形。UV 对应关系只计算一次，每帧更新位置。
- 继承 0.7.6 更清晰的生气火焰，以及 0.7.5 的四区输入、开心睁眼、困倦闭眼/zzz/口水、新图标、气泡等修改。

类型检查、四区 Q/A/U/H 手部独立性和实际 App WebGL 检查通过，核对静止、键盘手移开、鼠标按下及转头画面；同时使用深浅背景检查透明边缘。没有重复全部旧功能测试。

Windows EXE 与 NSIS 安装包已构建成功，独立副本与 SHA256 已保存；本轮用户按 Esc 停止 Windows 操作，新版 Windows 实机画面和安装卸载尚未验收。不得将浏览器画面算作 Windows 验收。

交付目录：`deliveries/20261012-desktop-0.7.7/`；GitHub：<https://github.com/HABAI182/changli-companion/releases/tag/v0.7.7>。版本、源码、附件和校验分别留档，旧版不覆盖。

CMO3/MOC3 仍为已验证 v71，本次是运行层边缘修复，没有新的 Cubism 导出。`formalArtComplete=false`：原生细致美术、部分大角度衔接和多屏/DPI 验收仍未全部完成。

单项证据：`tools/live2d-authoring/build/interactions-0.7.7-20261012/verification.json`；恢复指针：`tools/live2d-authoring/build/current-release/LATEST-RECOVERY.json`。
