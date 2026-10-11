# 参考资料与使用方式

整理日期：2026-09-24。以下为官方文档、项目仓库和作品参考，不是学术论文。网页和依赖可能更新，实施时复查版本与许可。

## 角色与作品

1. [宇痕冫的视频主页](https://space.bilibili.com/348616056/upload/video)
   - 用户指定的风格参考。观察桌前半身构图、键鼠同步、表情丰富度与小尺寸可读性。
   - 本次主页的视频列表加载不稳定，下列具体作品可作为补充。
2. [爱莉希雅桌宠：手柄、纯键盘、键鼠与表情](https://www.bilibili.com/video/BV1456HY5E6M/)
   - 用于理解互动方式与展示密度；不是长离角色外观依据。
3. [银狼Live2D桌宠展示](https://www.bilibili.com/video/BV1u94y187Ax/)
   - 用于比较按键动作与表情反馈；不要直接复制素材。
4. [《鸣潮》长离展示PV《执棋》](https://www.bilibili.com/video/BV1Tb421J7Tx/)
   - 长离的角色视觉、神态和动作气质参考。
   - 链接来自[鸣潮官方发布动态](https://www.bilibili.com/opus/955715319813374003)。本次直接读取视频页面失败，已用官方动态核实对应关系；未声称逐帧观看。
5. [《鸣潮》官网](https://mc.kurogames.com/)
   - 查找角色的官方资料；具体造型以官方图片和用户提供参考图为准。

## 工程参考

6. [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat)
   - README明确介绍Tauri跨平台桌宠、键鼠/手柄反馈与自定义模型，是本项目优先阅读的同类工程参考。检查实际源代码和许可证后决定是否复用。
7. [vladelaina/BongoCat](https://github.com/vladelaina/BongoCat)
   - 另一条原生实现路线，可参考输入反馈、模型组织与渲染。其架构与Tauri方案不同，不应直接混合构建配置。
8. [BongoCat官网](https://bongocat.pet/)
   - 用于体验和查阅模型制作、桌宠安装相关资料。官网展示素材不自动授予使用权。

## 官方技术文档

9. [Tauri 2开发环境要求](https://v2.tauri.app/start/prerequisites/)
   - Windows开发涉及Rust、Microsoft C++ Build Tools和WebView2；先确认环境，再声称能生成安装包。
10. [Tauri 2官方文档入口](https://v2.tauri.app/)
    - 从此查阅System Tray、Window Customization、Global Shortcut、Autostart、SQL与Capabilities；采用一致的Tauri 2接口。
    - 全局快捷键只能解决注册的快捷键，普通键鼠动作监听需要单独的原生实现。
11. [Live2D Cubism SDK官方说明](https://www.live2d.com/en/sdk/about/)
    - 真正接入Live2D模型时使用，核对Web/Native适配和适用许可。SDK不会把一张PNG自动变成已绑定模型。
12. [OpenAI提示词工程官方指南](https://developers.openai.com/api/docs/guides/prompt-engineering)
    - 本提示词采用清晰分节组织目标、上下文、约束和结果要求；具体产品方案与验收项为本项目定制。

## 发布前再核对

13. [《鸣潮》英文同人创作指引](https://wutheringwaves.kurogames.com/p/en/produce.html)
    - 该页面的一般衍生作品定义排除了游戏、软件与商业作品，不能据此认为桌宠软件已获公开发布或商业授权。计划发布时向官方确认适用规则与授权范围。
    - 代码许可证、角色IP和模型/贴图使用许可是不同事项，应分别记录。免费或个人开发本身不等于已获授权。

## 如何交给Codex

将本文件、01-CODEX-PROMPT.md、02-ART-DIRECTION.md放在目标项目目录，让Codex先阅读三份文件。若有官方角色参考图或已获许可的模型，一同放进references或assets目录。没有素材也可先开发窗口、计时、存储和输入逻辑，但最终报告必须保留素材状态说明。
