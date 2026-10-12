# 0.7.9 原图图标与设置改版

图标使用用户这次上传的完整原图，仅转换 Windows 打包所需格式；应用、托盘、设置头像与预览入口同步。

设置改为外观、互动、桌面、高级四分页，统一字号、间距、圆角卡片、开关和滑杆，采用 iOS/Windows 11 常见的简约分组布局。保留已有桌宠功能，未添加专注等额外模块。

新增九项偏好：深浅/系统主题、四种强调色、舒适/紧凑布局、鼠标视线跟随、大头弹性幅度、键盘四区移动幅度、鼠标/手/线缆移动幅度、气泡停留时长、空闲回应频率。按区动作仍全部归键盘手。旧版偏好保留，新字段自动补默认值；Windows 校验新增值的范围，所有设置继续自动保存。

设置窗口创建与再次打开时置顶并聚焦，保存设置时再次保持其显示优先级，避免置顶桌宠挡住设置。窗口默认宽 560、最小宽 420。

高级页增加“GitHub 更新”与“项目主页”。更新打开私有仓库 Releases 下载页，主页打开项目地址，使用浏览器已有登录状态；不在程序里保存 GitHub 凭据，未加入自动下载安装。

类型检查及 20 项相关测试通过，涵盖旧设置迁移、动作幅度独立性、气泡时长及已有交互/保存逻辑；没有重复全套旧功能测试。实际 App WebGL 和设置 UI 检查通过：四分页、主题/强调色/密度、滑杆保存后刷新、420px 无横向溢出及两个链接目标。Windows EXE 和 NSIS 安装包构建成功，Windows 实机核对新版启动、透明 Live2D、原图头像、旧版 131% 大小保留、四分页及强调色原生保存；设置在保存后保持显示于桌宠前方。更新按钮调用未报程序错误，浏览器连接器返回 nodeRepl.fetch request failed，故未宣称已验收外部浏览器的 GitHub 页面。链接目标在浏览器 App 测试中通过。安装卸载、全局输入及多屏/DPI 未重复验收。

独立交付：`deliveries/20261012-desktop-0.7.9/`；GitHub：<https://github.com/HABAI182/changli-companion/releases/tag/v0.7.9>。旧版不覆盖。[图标来源](tools/live2d-authoring/ICON-0.7.9.md)。

Live2D 原生 CMO3/MOC3 沿用 v71，本次没有重新导出模型。原生精细美术、多屏/DPI 等遗留验收仍未全部完成，`formalArtComplete=false`。单项证据：`tools/live2d-authoring/build/interactions-0.7.9-20261012/verification.json`；完整恢复指针：`tools/live2d-authoring/build/current-release/LATEST-RECOVERY.json`。
