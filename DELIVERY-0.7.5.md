# 0.7.5 交付记录

本版落实四区键盘、表情与消息泡调整；旧版独立保留。

- 靠近淡化默认关闭；本机当前亦为关闭。保留用户最后调整的大小和气泡开关。
- 气泡文字、内边距、圆角随主体缩放；100%边框2px、200%边框4px。去除中文及英文末尾句号。
- 左右/前后键区共用长离左手；前后运动较轻。Q/数字/F行属于后区，A/Z及下排修饰键属于前区，空格有单独落点。键盘朝向长离，空格位于靠角色一缘，键排与落点相配。
- 珊瑚粉发色、白色发尾、金黑发饰的简约头像替换EXE、安装包、托盘及浏览器图标。
- 开心睁眼微笑；困倦闭眼，右上方zzz依次缩小，嘴角少量口水。生气使用随脸火苗。
- 删除“打招呼”“入睡”播放器定义、菜单和运行入口的动作引用；旧快捷键目标自动停用。保留凤凰互动、生气冒火、害羞。
- 原有左尾羽加长、手部轮廓修整、弹性头部、凤凰翅膀/尾羽/火苗、拖动柄位置继续保留。

验证：81项前端测试、12项Rust测试、39个Live2D资源引用通过。App真实WebGL检查9键四区、表情、删动作、气泡50/100/200%与默认值通过，无页面错误。Windows便携EXE检查全局Q/A/U/H输入、透明模型、开心/困倦和气泡、图标、设置说明通过。安装包构建成功；本版不重复安装/卸载验收，多屏/DPI没有全面硬件验收。

交付路径：`deliveries/20261011-desktop-0.7.5/`，含便携EXE、安装包及SHA256.json。GitHub Release：<https://github.com/HABAI182/changli-companion/releases/tag/v0.7.5>，私有工程版。

运行入口：`ChangliReferenceRepairV71-desktop-v075.model3.json`。CMO3/MOC3沿用已验证v71，未重新导出；键盘与附加表情为运行时矢量美术。`formalArtComplete=false`：精细原生美术、部分大角度发束/袖口衔接仍待继续，不能称为完整美术正式版。

本地证据：`build/interactions-0.7.5-20261011/verification.json`、`build/installer-0.7.5-20261011/windows-verification-status.json`。最新恢复指针：`tools/live2d-authoring/build/current-release/LATEST-RECOVERY.json`。
