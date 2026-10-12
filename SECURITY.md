# 公测安全与隐私说明

当前安全检查日期：2026-10-12，版本 0.7.10。安全检查是有范围的检查，不是“绝对安全”保证。

- 完整 Git 历史以 Gitleaks 8.30.1 扫描；唯一排除是公开的 localStorage 名 `changli-companion-v1`，不是凭据。检测报告保留在本机，避免把报告中的个人信息发布出去。
- npm 依赖中的 source-map-js 已固定升级为 1.2.2，修复 [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)。更新后的 npm audit 为 0 项已知漏洞。
- Cargo.lock 的 OSV 查询包含非 Windows 依赖。glib 0.18.5 的 [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html) 不在 Windows 构建依赖树中。proc-macro-error 的停止维护提示也不在此目标依赖树中。
- Windows 依赖树仍包含五个 UNIC 0.9.0 组件的停止维护提示（RUSTSEC-2025-0075、0080、0081、0098、0100），目前没有对应修复版本。这些是维护状态告警，仍需跟踪上游迁移，不能称 Rust 依赖检查完全无告警。
- 不发布数据库、凭据、缓存、本机日志或恢复包。GitHub 发布附件保留版本与 SHA256 校验清单，旧版本不会覆盖。
- 窗口只加载打包的本地页面，使用限制性 CSP；主页/更新命令只允许两个固定 GitHub 地址。没有远程代码执行、自动下载运行更新或任意 shell 命令接口。
- 全局键鼠监听只提供瞬时动画事件；不转换或记录输入文本、不存储逐键历史、不上传输入。设置中可关闭。设置和菜单获得焦点时暂停其输入反馈；桌宠本身不再被误判为编辑窗口。
- 本机设置和互动统计保存在用户应用数据目录。外部浏览器访问 GitHub 时适用 GitHub 自身的隐私政策。
- EXE 暂无商业代码签名，未宣称通过全部杀毒软件或 SmartScreen 认证。校验哈希确认文件一致性，不代表安全认证。

发现敏感数据泄漏时请不要把秘密贴在公开 issue；使用 GitHub 仓库的私密漏洞报告入口（如果该入口可用）。一般界面/模型问题可以提交 issue，请遮挡截图中的个人信息，附版本、Windows 版本、缩放比例与复现步骤。

SDK 与素材许可见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) 和 [LICENSE-RUNTIME.txt](LICENSE-RUNTIME.txt)。视觉素材来源依据用户声明，项目不代表角色权利人或参考作者。
