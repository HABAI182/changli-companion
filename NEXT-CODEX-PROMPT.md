# 下一阶段 Codex 总 Prompt｜离火长明 Phase 2 体验升级

你现在接手的是一个已经完成 Phase 1 Windows 原生骨架收口的桌宠工程，不是从零项目。

## 0. 工作方式

先完整阅读并核对：

1. `README.md`
2. `TEST-REPORT.md`
3. `MERGE-REVIEW.md`
4. `CODEX-HANDOFF.md`
5. `HANDOFF-2026-09-24.md`
6. `specs/FINAL-SPEC.md`
7. 本轮新增的 `PHASE2-ENGINEERING-SPEC.md`
8. `src/`、`src-tauri/src/`、`public/models/changli/model.json`

然后直接开始实施，不要重新做已经通过的 Phase 1 工作，不要只给方案或伪代码。

当前已确认：

- 技术栈为 React + Vite + TypeScript + Tauri 2 + Rust。
- Windows release EXE、NSIS 打包已通过。
- 前端 27 项测试、Rust 测试、TypeScript、格式化、构建已通过。
- 透明窗口、跨应用输入、中文输入、穿透恢复、拖动、正常退出与重启位置恢复已有实机验证。
- 当前真正薄弱点是角色表现层：正式分层动作、真实表情、完整动画、Live2D、按键视觉反馈和 Phase 2 高级互动。
- 当前 `SpriteRenderer` 主要仍是一张静态 PNG + 局部高亮；`LayeredRenderer` 是开发用 SVG 动作原型，不能作为最终美术。
- `model.json` 目前仅有 8 个表情槽且 `asset=null`，2 个动画槽且 `frames=[]`。
- 原生键盘 hook 当前只向前端发送左右键区语义，不保存/传输具体按键。

本轮允许正式进入 Phase 2/3 中与“桌宠体验”直接相关的部分。不要继续受旧交接文件中“暂不进入 Phase 2/3”的历史限制；以本 Prompt 与 `PHASE2-ENGINEERING-SPEC.md` 为最新指令。

---

# 1. 本轮总目标

把现在的“能运行的静态桌宠骨架”升级成“真正会跟着用户操作电脑互动的 Q 版长离桌宠”。

参考体验：

- 用户指定视频：`https://www.bilibili.com/video/BV1YBYW6gEkC/`
- `specs/FINAL-SPEC.md` 中已有的宇痕系/Bongocat 交互目标。

**新增美术方向（用户 2026-09-25 明确要求）：未来制作的长离 Live2D 在 Q 版比例、桌前键鼠构图、动作节奏和精细度上要接近宇痕冫作品的体验，同时准确保留用户指定长离参考图中的发型、发饰、瞳色、服装与小凤凰。先制作原创分层设定与动作表，再制作、绑定并逐项实测真正的 Live2D 模型。不要复制宇痕冫的模型文件、贴图、参数工程或语音；缺少可合法使用的模型时明确标记资源待接入，程序工程继续推进。**

如果开发环境能访问上述视频，请先自行观察并整理其中**可见的交互功能、动作切换、按键显示、表情、菜单和状态反馈**，再映射到本工程；只参考体验与交互，不复制对方素材、模型、代码、语音或其他受版权保护资产。

如果视频无法访问，不要卡住，也不要声称看过；直接按照本 Prompt、现有规格和工程现状实现。

优先级：

1. 键鼠联动的“活感”
2. 正式分层动作系统
3. 表情系统
4. 完整动画系统
5. 按键浮现提示
6. Live2D 渲染链路
7. 小凤凰互动
8. 其余 Phase 2 功能
9. 性能、稳定性和隐私

---

# 2. 强制新增：按键浮现提示

这是本轮必须实际完成并验收的功能。

## 2.1 交互要求

用户在其他应用中按下按键时，在桌宠角色区域的**左上角**显示一个短暂浮层。

例如：

- 按 `Z` → 左上角显示 `Z`
- 按 `A` → 显示 `A`
- 按 `Enter` → 显示 `Enter`
- 按 `Backspace` → 显示 `Backspace`
- 按 `Space` → 显示 `Space`
- 方向键显示 `↑ ↓ ← →`
- 功能键显示 `F1`、`F2` 等

视觉要求：

- 不抢主视觉；Q 版、轻量、半透明或柔和描边。
- 出现时轻微 pop/fade-in，约 450–800ms 后淡出。
- 连续输入时应能快速刷新，不积累成满屏历史。
- 推荐最多显示最近 1–3 个键；高频打字时合并/替换，不创建大量 DOM。
- 按键浮层跟随桌宠缩放，不超出透明窗口太多。
- 提供设置开关。

## 2.2 原生输入数据要求

现有 `src-tauri/src/input.rs` 只发送语义 signal。修改为可以同时发送**瞬时显示标签**，但必须保持隐私边界：

- 不写入 SQLite。
- 不写日志。
- 不加入诊断历史。
- 不上传。
- 不保存完整输入序列。
- hook 回调仍然只做轻量转换 + 非阻塞发送，不能在 hook 内执行重逻辑。
- 事件到前端后只存在内存中，并在 UI 动画结束后丢弃。

建议 payload 形态（可按现有架构调整）：

```ts
interface SemanticInputEvent {
  signal: Signal;
  x: number;
  y: number;
  key?: {
    label: string;
    phase: 'down' | 'up';
    repeat?: boolean;
  };
}
```

至少支持 keydown；如果 Hold 表情/快捷键或更自然的输入动画需要 keyup，可一并加入。

不要把用户输入组成单词或文本；只显示当前物理按键标签。

---

# 3. 重构表现层：不要继续“一张 PNG 切四个状态”

建立明确的角色表现分层：

1. `BasePose`：idle / keyboard / mouse / sleep 等基础姿态
2. `Action`：left-key / right-key / enter / backspace / click / scroll 等短动作
3. `Expression`：可持续表情
4. `Animation`：一次性完整动画，具有高优先级
5. `Overlay`：按键浮层、火焰、火星、Zzz 等附加视觉
6. `PhoenixState`：小凤凰独立状态

状态机必须负责优先级和恢复，而不是在 React 组件里堆大量散乱 if/else。

建议优先级：

`manual animation > manual expression > special action > mouse click > keyboard input > idle > sleep`

完整动画播放期间，普通输入可以被记录为“最近输入”用于结束后的恢复，但不能直接把高优先级动画打断。

---

# 4. 正式分层动作

## 4.1 必须完成的软件能力

无论正式美术素材是否齐全，先把**真正可扩展的分层渲染机制**完成并接进实际运行程序。

不能把当前 `src/Renderer.tsx` 的 SVG 原型直接改名叫“正式分层美术”。

至少支持这些独立层/参数：

- 后发
- 身体/肩部
- 脸
- 左眼/右眼
- 眉毛
- 嘴
- 前发
- 发饰/流苏
- 左臂/左手
- 右臂/右手
- 键盘
- 鼠标
- 小凤凰
- 前景特效

如果现有正式图片无法直接拆出真实层：

- 不要伪造“已完成美术”。
- 建立 `assets/layers/` 的规范目录和 manifest。
- 保留可运行 fallback。
- 在 `ASSETS.md` 中列出缺失层、画布、锚点、旋转中心和需要补绘的遮挡区域。
- 软件逻辑、资源加载、状态映射、动画播放器、fallback 都必须先完成。

## 4.2 键盘动作

至少拆分：

- idle
- keyboard-left-down
- keyboard-left-up
- keyboard-right-down
- keyboard-right-up
- space
- enter
- backspace
- rapid typing

目标不是十指模拟，而是“用户按哪一侧，哪只小手马上有动作”。

连续输入：

- 不应每次从第 0 帧生硬重启。
- 左右手根据键区自然交替。
- 高频输入进入 rapid 模式。
- 停止输入 150–300ms 后平滑回 idle。

## 4.3 鼠标动作

至少：

- 鼠标手 idle
- 左键点击
- 右键点击
- 滚轮
- 鼠标移动轻微跟随

纯键盘模式：

- 两只手都回键盘。
- 鼠标动作完全不改变角色手部。

---

# 5. Idle 与自然动作

正式实现：

- 自动眨眼
- 轻微呼吸
- 头发轻微摆动
- 发饰/流苏轻微摆动
- 小凤凰轻微浮动
- 很轻的视线跟随

要求：

- Idle 动作不应有明显循环“机械感”。
- 眨眼周期可加入小范围随机抖动，但测试要可通过注入 RNG/时间源保持确定性。
- `motion=low/off` 要确实减少或关闭这些动作。
- 30 FPS/60 FPS 设定对逻辑速度不能产生影响。

---

# 6. 表情系统升级

从当前 8 个槽扩到 16 个左右，至少：

- default 默认
- smile 开心
- laugh 大笑
- angry 生气
- pout 鼓脸
- shy 害羞
- blush 脸红
- surprised 惊讶
- confused 疑惑
- resigned 无语
- wronged 委屈
- sleepy 困倦
- serious 认真
- proud 得意
- phoenix-eyes 凤凰瞳
- flame-eyes 火焰眼

小凤凰至少有：

- normal
- happy
- ruffled/angry
- sleep

表情必须和完整动画分离：

- Expression 可保持。
- Animation 有时长、循环次数、结束恢复策略。

支持 toggle / hold。

不要再用 `asset=null` 但 UI 声称可用；缺素材的表情必须清楚显示 unavailable/awaiting-art，或使用真正可工作的参数化表情。

---

# 7. 完整动画系统

至少实现 5 个动画的**播放器与状态行为**：

1. wave 挥手
2. phoenix 凤凰互动
3. sleep 入睡/睡眠
4. angry-fire 生气冒火
5. shy 害羞

动画系统需要：

- 明确时长
- 播放一次/有限循环
- priority
- interrupt policy
- onComplete
- 恢复到当前 expression + base state
- 可由快捷键、右键菜单、设置/调试面板触发

如果没有最终美术帧，允许使用清楚标注的开发占位动画验证播放器，但不能把占位动画算作“正式美术完成”。

---

# 8. Live2D

## 8.1 目标

在现有 Renderer 边界下新增 `Live2DRenderer`，使模型未来可由 `model.json` 配置选择：

- layered/sprite renderer
- Live2D renderer

输入系统、状态机、设置、托盘和数据层不能因为切到 Live2D 而重写。

## 8.2 真实 Live2D 完成条件

只有当工程内存在真实且合法可用的 Live2D 模型资源（例如 `.model3.json`、`.moc3`、纹理、motion/expression/physics 文件），并且程序实际加载、渲染、驱动成功时，才允许写“Live2D 已完成”。

当前只有静态 PNG 时：

- 完成 Live2D adapter、资源检测、生命周期、resize、透明背景、参数映射、motion/expression 调度和 fallback。
- 在 UI/README 中显示“Live2D runtime ready / model asset missing”之类准确状态。
- 不伪造 `.moc3`。
- 不把静态 PNG 包装成 canvas 就称为 Live2D。

## 8.3 参数映射建议

如果模型参数存在，建立语义映射层，不把参数 ID 散落在 UI：

- ParamAngleX/Y
- ParamEyeBallX/Y
- ParamEyeLOpen / ParamEyeROpen
- ParamMouthOpenY / mouth form
- body breathe
- hair/accessory physics
- left/right hand action parameters（如模型提供）
- phoenix parameters（如模型提供）

具体 ID 必须由模型 manifest 配置，不写死。

---

# 9. 小凤凰互动

小凤凰不再只是静态摆件。

至少实现：

- idle float
- 键入高频时轻微反应
- 开心表情时跳一下
- angry 时炸毛/火苗
- sleep 时缩成一团
- phoenix 完整动画时飞入/互动/回位

凤凰状态应能与角色表情/动画组合，但不能通过复制大量状态枚举制造状态爆炸。

---

# 10. 25 槽快捷键与触发系统

把当前 8 个表达式快捷键升级为数据驱动动作槽，至少 25 槽。

每个槽可绑定：

- expression
- animation
- effect
- voice
- compound action

字段至少：

- shortcut
- action type
- action id
- trigger mode: toggle / hold / once
- enabled

要求：

- 冲突检测。
- 注册失败不得影响其他槽。
- 设置窗口中可编辑。
- 保存后尽量即时重注册。
- 保留恢复穿透快捷键的最高可靠性，不能被普通动作槽覆盖。

---

# 11. 其他 Phase 2 功能

在核心动作、表情、按键浮层、Live2D 架构稳定后继续实现：

## 11.1 Hover Hide

- 鼠标进入桌宠区域后延迟降低透明度或隐藏。
- 离开恢复。
- 延迟和透明度可配置。
- 与 click-through 共存时逻辑清晰。

## 11.2 自动睡眠

- 默认可关闭或设置 5–15 分钟。
- idle → sleepy → sleep。
- 新键鼠输入立即唤醒。

## 11.3 视线跟随

- 轻微、限幅、平滑。
- motion low/off 时减弱或关闭。

## 11.4 手柄

- 使用适合 Windows/Tauri 的稳定方案实现 XInput/兼容手柄输入。
- 无手柄不报错。
- 至少支持左右摇杆、ABXY、肩键、扳机、十字键。
- 映射进入统一 semantic input/action 层，不直接操作 Renderer。

## 11.5 音效/语音

- 本地文件。
- 总开关、单独开关、音量、冷却。
- 默认键盘音关闭。
- 不打包未经授权的游戏语音。

## 11.6 开机启动、帧率、托盘与菜单

补齐并实测：

- Start with Windows
- 30/60 FPS
- tray 全部菜单
- 右键表情/动画菜单
- 输入模式：键鼠/纯键盘/手柄
- Hover Hide
- Click-through
- Reset position

---

# 12. model.json 升级

将 schema 升级到可表达：

- renderer 类型
- layered assets
- Live2D entry
- base states
- actions
- expressions
- animations
- overlays
- phoenix states
- key mapping
- gamepad mapping
- 25 shortcut slots
- sounds / voices
- feature capability

需要有 schema version 和迁移/兼容策略。

不要把所有字段塞进 `App.tsx`。

---

# 13. 设置 UI

设置至少分组：

- 外观：缩放、FPS、motion、renderer/model 状态
- 输入：键鼠/纯键盘/手柄、按键浮显
- 互动：视线、Hover Hide、自动睡眠
- 快捷键：恢复键 + 25 动作槽
- 声音：voice/sfx 音量与开关
- 系统：置顶、穿透、开机启动、重置位置
- 模型诊断：当前 renderer、缺失资源、Live2D 是否可用

保持中文 UI。

---

# 14. 隐私与安全边界

必须继续遵守：

- 不保存用户键入内容。
- 新增按键浮层也不得写盘。
- 不做 key history。
- 不上传按键。
- 不访问浏览内容。
- 不注入/修改其他应用输入。
- Windows hook 始终调用 `CallNextHookEx`。
- hook 内不做阻塞 IO、渲染或复杂逻辑。

README 要解释：按键浮显只显示短暂物理键标签，并可关闭。

---

# 15. 测试与验收

每完成一个工作包都运行：

```powershell
npm run typecheck
npm test
npm run format:check
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

核心阶段完成后运行：

```powershell
./Verify-Phase1.ps1 -Package
```

脚本名称可以暂时保留，但应扩展验证内容或新增 Phase2 验证脚本。

至少新增测试：

- semantic event 的 key label 映射
- 不持久化 key label
- 高频 key overlay 限流/淘汰
- state priority
- animation completion + restore
- expression toggle/hold
- keyboard-only 过滤 mouse
- sleep wakeup
- model schema v2 validation
- fallback renderer
- Live2D missing asset 不崩溃
- shortcut conflict isolation
- settings migration

Windows 实机至少验收：

- 记事本中按 Z，桌宠左上角出现 `Z`
- 连续打字动作连贯
- 左右键区对应左右手
- Enter/Backspace/Space 有独立反馈
- 鼠标左右键和滚轮反馈
- 纯键盘模式不响应鼠标手
- 表情 toggle/hold
- 完整动画结束正确恢复
- Hover Hide
- 穿透及恢复
- 托盘菜单
- 多屏/DPI
- 安装/卸载
- 运行 30–60 分钟的资源与稳定性观察

所有验收结果继续写入 `TEST-REPORT.md`，严格区分：

- 自动测试通过
- Windows 实机通过
- 代码已实现但未实测
- 被资源阻塞
- 未完成

---

# 16. 最终交付要求

本轮不要只给我“完成了什么”的文字总结。

实际修改工程，并最终输出：

1. 修改文件清单
2. 架构变化
3. 已实际完成的体验功能
4. 被正式美术/Live2D 模型资源阻塞的项目
5. 自动测试结果
6. Windows 实机测试结果
7. EXE / 安装包路径
8. `TEST-REPORT.md` 更新摘要
9. 下一轮只剩下什么

禁止：

- 删除现有专注、待办、设置、托盘、输入和存储功能。
- 用静态 PNG 冒充 Live2D。
- 用同一张图冒充 16 个表情。
- 把“代码存在”写成“实机已验收”。
- 因为缺最终美术就完全停工。
- 为了赶功能把状态全部写进一个 React 组件。

目标是让桌宠从“静态预览 + 输入高亮”真正升级到“会打字、会点鼠标、会眨眼、会换表情、会播放完整动画、能显示当前按键、可接真实 Live2D 的长期可维护版本”。
