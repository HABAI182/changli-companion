# 离火长明｜Phase 2 工程规格与实现交接

版本：2026-09-25

## 1. 文档定位

本文档是当前工程进入正式互动表现阶段后的工程约束与实现蓝图。

视觉验收目标补充：用户要求长离 Live2D 参考宇痕冫桌宠的 Q 版比例、桌前键鼠动作的即时感与表情完成度。角色身份以用户提供的长离图片及官方识别特征为准。模型应为新制作、获授权的独立素材；无真实分层源文件时不得把单张 PNG 或程序覆盖效果称为已完成 Live2D。工程实现和验证持续进行，素材缺口单独记录。

它不是重新定义 Phase 1；Phase 1 Windows 骨架已经能够编译、打包和运行。本文档主要解决：

- 正式分层动作
- 表情
- 完整动画
- Live2D 渲染链路
- 按键浮现提示
- 小凤凰互动
- 25 槽快捷键
- Hover Hide
- 自动睡眠
- 视线跟随
- 手柄
- 声音
- Phase 2 设置与验收

若旧交接文件仍写着“暂不进入 Phase 2/3”，以本文档和最新用户需求为准。

---

# 2. 当前工程事实

## 2.1 技术栈

- React 19
- TypeScript
- Vite
- Tauri 2
- Rust
- Windows WebView2
- SQLite（Rust `rusqlite`）

## 2.2 当前已经成立的能力

从现有工程与 `TEST-REPORT.md` 可知：

- release EXE 已生成并运行。
- NSIS 安装包能够构建。
- 透明、无边框桌宠窗口存在。
- 原生缩放存在。
- 全局键盘左右区语义输入存在。
- 全局鼠标语义输入存在。
- 穿透 + 恢复快捷键存在。
- 设置窗口可打开。
- 中文 IME 可用于设置/待办编辑。
- 原生拖动已修复。
- 正常退出与重启位置恢复已实测。
- SQLite 设置持久化存在。
- Tray、置顶、模式切换、位置修正已有基础代码。
- 专注和今日待办是已有产品功能，必须保留。

## 2.3 当前表现层的主要缺口

### `src/SpriteRenderer.tsx`

当前把 `idle / keyboard_left / keyboard_right / mouse` 映射到资源，但实际都指向同一 `base` PNG。

目前的 `input-feedback` 是局部高亮，不是真正手部动画。

### `src/Renderer.tsx`

已有程序化 SVG 分层动作原型，可证明状态逻辑，但造型不是用户最终选定美术，不能作为正式视觉交付。

### `public/models/changli/model.json`

当前：

- schema 1
- renderer = sprite
- 仅 `base` 一张图片
- 8 个 expression 槽全部没有正式 asset
- 2 个 animation 槽 frames 为空
- 8 个 Ctrl+Alt 数字快捷键
- gamepad / sounds 基本为空

### `src-tauri/src/input.rs`

当前低级 hook：

- keyboard keydown → 左/右键区 semantic signal
- mouse → left/right/wheel/move
- 事件异步送前端
- 不保存键码/文本

这套隐私边界正确，但不能支持“按 Z 左上角显示 Z”，因此本阶段要增加**瞬时、非持久化 key display label**。

---

# 3. 本阶段产品目标

用户触发输入时，应该能产生非常直接的角色反馈：

```text
用户输入
  ↓
Native/Input Layer
  ↓
Semantic Event
  ↓
Character Runtime / State Machine
  ├─ Base pose
  ├─ Action
  ├─ Expression
  ├─ Animation
  ├─ Overlay
  └─ Phoenix state
  ↓
Renderer Adapter
  ├─ Layered/Sprite
  └─ Live2D
```

核心原则：

> 输入层不知道具体美术；状态机不知道具体 DOM/Canvas；Renderer 不负责决定动作优先级。

---

# 4. 建议的目标模块结构

不要求一次移动全部文件，但最终职责应接近：

```text
src/
  app/
    App.tsx

  input/
    semantic.ts
    keyLabels.ts
    gamepad.ts

  pet/
    runtime.ts
    stateMachine.ts
    priorities.ts
    expressionManager.ts
    animationManager.ts
    idleController.ts
    phoenixController.ts

  renderer/
    types.ts
    RendererHost.tsx
    layered/
      LayeredRenderer.tsx
      layerManifest.ts
    sprite/
      SpriteRenderer.tsx
    live2d/
      Live2DRenderer.tsx
      Live2DAdapter.ts
      live2dManifest.ts

  overlay/
    KeyOverlay.tsx
    EffectOverlay.tsx

  model/
    schema.ts
    loader.ts
    migrate.ts

  audio/
    AudioManager.ts

  settings/
    ...
```

Rust：

```text
src-tauri/src/
  input.rs
  shortcuts.rs          # 可从 main.rs 逐步拆
  gamepad.rs            # 若采用 Rust 侧
  model.rs
  storage.rs
  windows.rs
  main.rs
```

不为重构而重构；优先保证每次改动可编译、可测试。

---

# 5. 统一输入事件

## 5.1 目标结构

推荐前端统一类型：

```ts
export interface SemanticInputEvent {
  signal:
    | 'keyboard_left'
    | 'keyboard_right'
    | 'enter'
    | 'backspace'
    | 'space'
    | 'left'
    | 'right'
    | 'wheel'
    | 'move'
    | 'gamepad'
    | 'pet'
    | 'complete';

  x?: number;
  y?: number;

  key?: {
    label: string;
    phase: 'down' | 'up';
    repeat?: boolean;
  };

  at: number;
}
```

不要让 `key.label` 进入持久化 Data。

## 5.2 Key Label 映射

Rust 侧只把 vkCode 转为**单个物理键的展示名**，不进行文本输入推断。

至少覆盖：

- A–Z
- 0–9
- F1–F12
- Enter
- Backspace
- Space
- Tab
- Esc
- Shift
- Ctrl
- Alt
- CapsLock
- arrows
- Home/End/PageUp/PageDown
- Insert/Delete
- 常用标点物理键

不要：

- 拼接词句
- 保存历史
- 猜测 IME 最终汉字
- 记录密码字段内容

## 5.3 高频输入

hook 线程只做：

1. 读取事件
2. 映射 signal / label
3. `try_send`
4. `CallNextHookEx`

前端 overlay 自己做节流/替换。

---

# 6. Key Overlay（按键浮层）规格

## 6.1 位置

角色窗口左上区域。

建议：

```css
position: absolute;
left: 5%;
top: 6%;
pointer-events: none;
```

实际需避免盖住角色主要发饰。

## 6.2 生命周期

单次 keydown：

```text
0 ms      spawn
0–80 ms   pop in
80–450 ms hold
450–700ms fade out
```

高频输入：

- 默认只保留最近一个大 key badge。
- 可选最近三个小 badge 横排。
- 同键 repeat 不反复创建 DOM，可更新 token/id 触发轻微 pulse。
- 队列必须有上限。

## 6.3 推荐视觉

- 20–32px 等效字号，随桌宠缩放。
- 圆角 keycap。
- 半透明深/浅底，根据当前美术自动选一种固定主题即可。
- 轻描边。
- 不显示长串文字。

## 6.4 设置

新增：

```ts
keyOverlay: {
  enabled: boolean;
  durationMs: number;
  maxVisible: 1 | 2 | 3;
  showModifiers: boolean;
}
```

最少先实现 `enabled`，其余可后续暴露 GUI。

---

# 7. 角色 Runtime

当前 `CharacterMachine` 已有基础 priority，但状态维度混在一个 `pose` 枚举里。

建议升级为组合式 runtime：

```ts
interface CharacterRuntimeState {
  base: BaseState;
  action: ActiveAction | null;
  expression: ExpressionId;
  animation: ActiveAnimation | null;
  overlay: OverlayState;
  phoenix: PhoenixState;
  gaze: { x: number; y: number };
  idle: IdleState;
}
```

这样可以出现：

```text
base = keyboard_mouse
expression = blush
action = keyboard_left
phoenix = happy
overlay = key Z
```

而不是为了每种组合新增 pose。

---

# 8. 动作优先级

建议数字：

| 类别                       |          priority |
| -------------------------- | ----------------: |
| manual full animation      |               100 |
| special scripted animation |                90 |
| manual expression          | independent layer |
| pet interaction            |                80 |
| mouse click                |                70 |
| Enter/Backspace/Space      |                65 |
| keyboard left/right        |                60 |
| mouse move                 |                50 |
| idle micro-motion          |                10 |
| sleep                      |            0/base |

Expression 通常不和 Action 抢同一个槽；Animation 可以临时覆盖 expression，并在完成后恢复。

---

# 9. 正式分层渲染数据

## 9.1 Layer Manifest

建议模型层提供：

```json
{
  "canvas": [1254, 1254],
  "layers": [
    { "id": "back_hair", "asset": "layers/back_hair.png", "z": 10, "anchor": [0.5, 0.5] },
    { "id": "body", "asset": "layers/body.png", "z": 20, "anchor": [0.5, 0.5] },
    { "id": "face", "asset": "layers/face.png", "z": 30, "anchor": [0.5, 0.5] },
    { "id": "eyes", "asset": "layers/eyes.png", "z": 40, "anchor": [0.5, 0.5] },
    { "id": "front_hair", "asset": "layers/front_hair.png", "z": 50, "anchor": [0.5, 0.5] },
    { "id": "left_hand", "asset": "layers/left_hand.png", "z": 60, "anchor": [0.5, 0.5] },
    { "id": "right_hand", "asset": "layers/right_hand.png", "z": 60, "anchor": [0.5, 0.5] },
    { "id": "keyboard", "asset": "layers/keyboard.png", "z": 70, "anchor": [0.5, 0.5] },
    { "id": "mouse", "asset": "layers/mouse.png", "z": 70, "anchor": [0.5, 0.5] },
    { "id": "phoenix", "asset": "layers/phoenix.png", "z": 80, "anchor": [0.5, 0.5] }
  ]
}
```

真实项目字段可改，但需：

- 统一画布
- 固定锚点
- z-order
- pivot
- transform
- visibility
- opacity
- variant/frame

## 9.2 正式素材要求

需要补绘的典型遮挡区域：

- 手臂被身体覆盖处
- 前后发交界
- 眼睛闭合层
- 嘴型
- 眉毛
- 鼠标手下方
- 两手放键盘时原鼠标区域
- 凤凰背后的角色轮廓

不能从单张合成 PNG 获得真实完整的被遮挡像素，因此工具自动拆层只能作为草稿。

---

# 10. Idle 动作参数

Layered renderer 最少提供：

```ts
interface IdleParameters {
  breathe: number; // 0..1
  blinkLeft: number; // 0..1
  blinkRight: number;
  hairSway: number; // -1..1
  ornamentSway: number;
  phoenixFloat: number;
  gazeX: number;
  gazeY: number;
}
```

动作幅度应小。

Idle controller 独立于 FPS：使用 elapsed time，不使用“每帧加固定值”。

---

# 11. 键盘动作系统

## 11.1 键区

保留现有左右区：

左：

```text
Q W E R T
A S D F G
Z X C V B
```

右：

```text
Y U I O P
H J K L
N M
```

特殊：

- Space
- Enter
- Backspace

## 11.2 手部相位

每只手至少两个 phase：

- up/rest
- down/tap

连续键：

- 重复左键区时左手上下交替。
- 左右键区切换时相应手立即响应。
- 5–7 次/700ms 可进入 rapid typing。

建议动作时长：

- tap：100–180ms
- Enter：250–450ms
- Backspace：200–350ms
- Space：150–250ms
- 回 idle：150–300ms

精确值以视觉效果调整。

---

# 12. 鼠标动作系统

鼠标模式：

- hand on mouse
- move micro motion
- left click
- right click
- wheel

`move` 只应驱动轻微手腕/视线，不应每 33ms 重启完整动画。

点击是离散 action。

---

# 13. Expression（表情）

目标 16 套：

```text
default
smile
laugh
angry
pout
shy
blush
surprised
confused
resigned
wronged
sleepy
serious
proud
phoenix_eyes
flame_eyes
```

表达方式优先级：

1. Live2D expression/parameter preset
2. 分层脸部 asset variant
3. Sprite expression frame

不存在素材时返回 capability=false，不做假成功。

---

# 14. Animation（完整动画）

目标：

```text
wave
phoenix_interaction
sleep_transition
angry_fire
shy
```

统一定义：

```ts
interface AnimationDefinition {
  id: string;
  durationMs: number;
  loopCount: number;
  priority: number;
  interrupt: 'none' | 'higher-only' | 'any';
  restore: 'previous' | 'idle';
  rendererMotion?: string;
  spriteFrames?: FrameDef[];
  effects?: EffectCue[];
  audio?: AudioCue[];
}
```

播放器只接受定义，不知道动画由 Live2D motion 还是 PNG frames 实现。

---

# 15. 小凤凰

PhoenixState：

```text
normal
happy
ruffled
sleep
flying
```

凤凰控制器响应高层事件：

- character smile → happy burst
- angry → ruffled
- sleep → sleep
- phoenix animation → flying
- normal input → subtle bob only

避免每个角色 pose 都复制一套 phoenix pose。

---

# 16. Live2D Renderer

## 16.1 架构要求

Renderer interface 不应只接受整个 `CharacterMachine` 对象然后自行猜动作；应逐步演进成更稳定的渲染快照：

```ts
interface RenderSnapshot {
  base: BaseState;
  action: ActionSnapshot | null;
  expression: string;
  animation: AnimationSnapshot | null;
  gaze: { x: number; y: number };
  idle: IdleParameters;
  phoenix: PhoenixState;
  motionLevel: 'full' | 'low' | 'off';
}
```

所有 renderer 消费同一 snapshot。

## 16.2 Live2D Asset

真实 Live2D 模型应由 Cubism Editor 导出的 embedded/runtime 数据驱动。

典型入口：

```text
xxx.model3.json
xxx.moc3
textures/
motions/*.motion3.json
expressions/*.exp3.json
physics*.json
pose*.json
```

并非所有文件都必须存在，但 `.model3.json` 必须能引用实际模型资源。

当前工程只有静态 PNG，因此：

- 先接 runtime adapter。
- 运行时检测 `live2d.entry`。
- entry 缺失时自动 fallback 到 layered/sprite。
- diagnostics 明确原因。

## 16.3 生命周期

必须处理：

- init
- async load
- model ready
- resize
- device/context lost（若 SDK 需要）
- dispose
- renderer switch
- missing/corrupt asset

不能因 Live2D 加载失败导致整个桌宠白屏。

## 16.4 语义映射

模型配置提供：

```json
{
  "parameterMap": {
    "gazeX": "ParamEyeBallX",
    "gazeY": "ParamEyeBallY",
    "blinkL": "ParamEyeLOpen",
    "blinkR": "ParamEyeROpen",
    "breathe": "ParamBreath"
  },
  "motionMap": {
    "wave": "Wave01",
    "keyboard_left": "KeyLeft",
    "keyboard_right": "KeyRight"
  },
  "expressionMap": {
    "smile": "Smile",
    "angry": "Angry"
  }
}
```

参数名示意；实际以模型文件为准。

---

# 17. model schema v2

建议：

```json
{
  "schema": 2,
  "name": "Changli",
  "display_name": "长离",
  "version": "0.2.0",

  "renderer": {
    "preferred": "live2d",
    "fallback": "layered",
    "live2d": {
      "entry": null,
      "parameterMap": {},
      "motionMap": {},
      "expressionMap": {}
    },
    "layered": {
      "manifest": "layers/layers.json"
    }
  },

  "states": {},
  "actions": {},
  "expressions": [],
  "animations": [],
  "phoenix": {},
  "overlays": {},
  "key_bindings": {},
  "shortcuts": [],
  "gamepad_bindings": {},
  "sounds": {},
  "voices": {},

  "capabilities": {
    "layered": false,
    "live2d": false,
    "audio": false
  }
}
```

实际 schema 应有 validator。

Schema 1 用户数据/模型配置要有兼容读取或迁移。

---

# 18. 快捷键系统

当前 8 条 expression shortcut 扩成通用 action slot。

```ts
interface ShortcutSlot {
  id: string;
  enabled: boolean;
  shortcut: string;
  trigger: 'toggle' | 'hold' | 'once';
  action: {
    type: 'expression' | 'animation' | 'effect' | 'voice' | 'compound';
    id: string;
  };
}
```

数量至少 25。

约束：

- 恢复穿透键不是普通槽。
- 冲突时显示具体槽位。
- 一个槽注册失败不得回滚所有其他槽。
- hold 需要 keyup/release 语义。

---

# 19. Hover Hide

状态：

```text
normal → hover_pending → faded/hidden → restoring → normal
```

设置：

```ts
hoverHideEnabled;
hoverHideDelayMs;
hoverOpacity;
```

注意与非聚焦窗口、click-through 的兼容。

---

# 20. Sleep

设置：

```ts
sleepEnabled;
sleepyAfterMinutes;
sleepAfterMinutes;
```

逻辑：

```text
active
  --idle threshold--> sleepy
  --second threshold--> sleeping
  --any real input--> active
```

手动 sleep animation 与自动 sleep 要可区分。

---

# 21. Gaze（视线跟随）

输入来源优先：

1. 全局鼠标位置/位移
2. Live2D parameter
3. layered eye transform

实现：

- clamp
- low-pass smoothing
- deadzone
- motion setting scale

不要让鼠标快速移动导致眼球抖动。

---

# 22. Gamepad

Gamepad 最终也输出 SemanticInputEvent/Action，不直接操作 renderer。

语义：

```text
left_stick
right_stick
A B X Y
LB RB LT RT
dpad_up/down/left/right
```

无手柄时 silent idle。

---

# 23. Audio

统一管理：

```ts
AudioManager.play(cueId, { volume, cooldownKey });
```

设置：

```text
voiceEnabled
voiceVolume
sfxEnabled
sfxVolume
keyboardSfxEnabled (default false)
```

音频只读本地合法素材。

---

# 24. 设置数据升级

当前 Settings：

```text
scale
topmost
passthrough
motion
fps
autostart
shortcut
inputMode
```

建议增量扩展：

```text
keyOverlayEnabled
hoverHideEnabled
hoverHideDelayMs
hoverOpacity
gazeEnabled
sleepEnabled
sleepyAfterMinutes
sleepAfterMinutes
voiceEnabled
voiceVolume
sfxEnabled
sfxVolume
keyboardSfxEnabled
rendererPreference
gamepadEnabled
```

必须保证旧数据库数据补默认值即可正常启动。

---

# 25. UI 规格

## 25.1 设置

分组：

### 外观

- scale
- 30/60 fps
- motion full/low/off
- renderer status

### 输入

- keyboard_mouse
- keyboard_only
- gamepad
- key overlay

### 互动

- gaze
- hover hide
- sleep

### 快捷键

- recovery shortcut
- 25 action slots

### 声音

- voice
- sfx
- volume

### 系统

- topmost
- passthrough
- autostart
- reset position

## 25.2 诊断

只展示：

- native hook active
- current renderer
- model loaded
- live2d available/missing
- semantic event aggregate count

不要展示按键历史。

---

# 26. 右键菜单与 Tray

右键：

```text
表情 >
动画 >
输入模式 >
缩放 >
按键浮显
Hover Hide
始终置顶
鼠标穿透
设置
退出
```

Tray：

```text
显示/隐藏
置顶
输入模式
按键浮显
穿透/恢复
表情
动画
设置
重置位置
退出
```

菜单不宜一次铺开 25 个快捷键槽。

---

# 27. 性能约束

## 27.1 Hook

- no blocking IO
- no logging per key
- bounded channel
- drop acceptable under extreme load

## 27.2 React

按键 overlay 不应导致整个 `App` 每次 keydown 重渲染大量设置 UI。

建议：

- 独立 overlay store/component
- memoized renderer
- requestAnimationFrame

## 27.3 Renderer

Idle 30 FPS 时不应强制 60 FPS。

如果 Live2D SDK 自带 loop，应和应用帧率策略协调，避免双重 loop。

## 27.4 目标

不写死虚假 CPU/GPU 百分比承诺；实际 release 测量后记录。

---

# 28. 隐私约束

项目 README 的核心隐私承诺继续成立：

> 程序只读取按键状态用于驱动桌宠动作，不保存用户输入内容。

新增 key overlay 后补充：

- display label 仅实时存在于内存。
- 不持久化。
- 可关闭。
- 不构造文本历史。

调试日志禁止输出每个键。

---

# 29. 自动测试矩阵

## Input

- A/Z → keyboard_left + label
- P/M → keyboard_right + label
- Enter
- Backspace
- Space
- arrow/function key label
- own editor filter

## Overlay

- spawn
- expiry
- queue cap
- repeat collapse
- disabled = no render

## Runtime

- priority
- animation lock
- restore
- expression toggle
- expression hold
- rapid typing
- sleep/wakeup
- phoenix combination

## Model

- schema2 parse
- schema1 migrate
- safe resource paths
- missing layered asset
- missing Live2D entry
- corrupt Live2D entry → fallback

## Settings

- old DB fills defaults
- values persist
- shortcut conflicts isolated

---

# 30. Windows 实机验收矩阵

## 必测 P0

1. 桌宠 release 启动。
2. 记事本获得焦点。
3. 按 `Z`。
4. 左手有反馈。
5. 桌宠左上角短暂显示 `Z`。
6. 继续输入 `asdf jkl;`，左右手响应自然。
7. Enter、Backspace、Space 有特殊反馈。
8. 鼠标 left/right/wheel 有对应动作。
9. 纯键盘模式下鼠标不改手姿势。
10. 手动表情 toggle/hold。
11. 完整动画期间普通按键不打断。
12. 动画结束恢复正确。
13. 穿透恢复仍正常。
14. 正常退出、位置恢复不回归。

## P1

- Hover Hide
- sleep/wakeup
- gaze
- 25 slot registration
- tray menu
- gamepad
- sound
- 30/60 FPS

## P2

- multi-monitor
- mixed DPI
- monitor unplug
- admin app
- RDP
- system sleep/resume
- 30–60 min soak test

---

# 31. 美术交付清单

如果需要外部绘制/Live2D 建模，Codex 必须生成清楚的 `ART-ASSET-REQUEST.md`。

至少写出：

## Layered

- 1254×1254 canvas
- 每层 PNG
- 不分别裁切
- 每层 pivot
- 遮挡补绘要求
- face variants
- hand frames
- phoenix variants

## Live2D

需要真正的 Live2D 建模源和导出资源；仅单张成图不足以自动得到高质量正式 Live2D rig。

工程侧可以提前完成 runtime、adapter 和参数映射机制。

---

# 32. 推荐实施顺序

## Work Package 1 — Input v2 + Key Overlay

完成：

- Rust key label
- semantic event v2
- transient overlay
- setting
- tests
- Windows Z 实测

这是本轮第一里程碑。

## Work Package 2 — Runtime v2

完成：

- base/action/expression/animation/overlay/phoenix 分离
- priority
- restore
- migration from CharacterMachine

## Work Package 3 — Layered Renderer

完成：

- layer manifest
- transforms
- blink/breathe/hair/eye/hand/mouse
- fallback

## Work Package 4 — Expressions + Animations

完成：

- 16 expressions definitions
- 5 animation definitions
- player
- menu/settings hooks

## Work Package 5 — Live2D Adapter

完成：

- renderer adapter
- async load/failure/fallback
- parameter/motion/expression map
- diagnostics
- sample only if legal model asset exists

## Work Package 6 — Advanced interaction

完成：

- phoenix
- gaze
- hover hide
- sleep
- gamepad
- audio

## Work Package 7 — 25 Shortcuts + Settings

完成：

- editor
- conflict isolation
- persistence
- re-registration

## Work Package 8 — QA / Package

完成：

- tests
- release
- NSIS
- real Windows matrix
- docs

---

# 33. Definition of Done

不能因为某个 class/file 存在就算完成。

## Key Overlay Done

- 外部应用按 Z 真显示 Z。
- 自动消失。
- 高频输入不卡。
- 无持久化。

## Layered Done

- 至少眼/身体/手/凤凰中的多个层能独立运动。
- 真实输入实际驱动。
- 不再只是输入区域发光。

## Expression Done

- 表情改变角色可见脸部或真实模型参数。
- toggle/hold 正常。

## Animation Done

- 有播放生命周期。
- 不被普通输入错误打断。
- 正确恢复。

## Live2D Runtime Done

- 能加载真实 `.model3.json` 模型并显示，或者明确因项目缺模型而处于 runtime-ready/fallback 状态。
- 缺资源不崩溃。

## Live2D Model Done

只有真实模型 asset 已加入并实际工作才算。

---

# 34. 不允许的捷径

- 同一张 PNG 复制 16 次当 16 个表情。
- CSS 整体上下抖动称“分层动作”。
- Canvas 显示静态 PNG 称“Live2D”。
- 把 key history 写日志用于调试。
- 在 hook callback 做同步磁盘 IO。
- 把所有状态塞回 `App.tsx`。
- 为了新功能删除专注/待办。
- 未跑 release 就写“Windows 已通过”。

---

# 35. 最终体验目标

打开桌宠后：

- 长离有自然呼吸和眨眼。
- 用户按 `Z`，左手立即敲一下键盘，左上角轻轻浮出 `Z`。
- 用户快速打字，双手自然连续动作，小凤凰有轻微反馈。
- 用户点鼠标，鼠标手同步点击。
- 用户切一个表情，它会持续保持。
- 用户触发凤凰互动，完整动画播放，普通键入不会打断，结束后继续原状态。
- 长时间无操作时自然困倦/睡觉；新输入唤醒。
- 有 Live2D 模型时无缝换为 Live2D；没有时仍有正式分层 renderer 可用。

最终应像“陪着用户操作电脑的桌面角色”，而不是一张会亮局部的 PNG。
