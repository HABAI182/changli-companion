# 角色素材契约 · v0.4

根目录：`public/models/changli/`。统一配置为 `model.json`（schema 2）；`preview.jpg` 只用于查阅；透明占位为 `assets/changli-cutout.png`。新模型文件名建议以 `Changli` 开头，纹理按 Cubism 导出原名保留，版本号在 `model.json.version` 和交付清单中同步更新。所有引用使用相对路径，不能跳出角色目录或指向网络。

分层资源：`assets/layers/layers.json` 与同一 1254×1254 透明画布上的独立 PNG。图层 ID 已定义为 back_hair、body、face、left_eye、right_eye、brows、mouth、front_hair、ornaments、left_arm_hand、right_arm_hand、keyboard、mouse、phoenix、foreground_effects。每层应补全被遮挡区域并提供锚点、转轴、z 顺序。未全部就位时 `status` 保持 `awaiting-art`、`asset` 保持 null，程序使用原图占位。现有单图不能机械裁剪为可信图层。

Live2D 资源：`live/*.model3.json` 引用同目录 `.moc3` 和纹理，这是加载必需项；可选 physics3、pose3、userdata3、exp3、motion3。语义参数、动作组、表情名在 `model.json.renderer.live2d` 中映射，点击区域在 `model.json.hotspots` 中配置。不要将运行时 SDK 许可误作角色素材授权；正式长离模型及可分发权需单独确认。示例模型不得进入交付包。

视觉要求：依据用户提供的 Q 版长离图，保留粉红/浅白发、金黑发饰、瞳色、键鼠与小凤凰识别点；按桌宠尺寸检查脸部清晰度、头身比和动作幅度。宇痕冫作品作为灵动感与反馈节奏参考，不直接复制现成角色图、动作或代码。
