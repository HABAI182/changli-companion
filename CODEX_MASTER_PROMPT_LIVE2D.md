# 长离桌宠：Codex 总执行指令（Live2D 可替换架构版）

> 文件用途：将本文件直接放入项目根目录，并交给 Codex 作为后续开发的总执行规范。
>
> 核心原则：**Codex 先完成桌宠架构、交互、占位表现层、Live2D 接入层、测试与文档；正式长离 Live2D 模型后续作为独立资源接入。不得因为当前缺少正式 Live2D 模型而停止整体开发。**
>
> 最终成品风格方向：**参考“宇痕冫”系桌宠的 Q 版、灵动、陪伴感与反馈密度，但不得机械照抄现成实现。**

---

# 一、项目总目标

你现在接手的是一个 Windows 桌宠项目。

当前目标不是立即产出最终的长离 Live2D 成品，而是：

1. 先把桌宠程序的整体架构、交互逻辑、状态机、设置系统、资源管理、渲染抽象层全部做扎实。
2. 当前阶段允许使用 sample model（示例模型）、占位模型、分层 2D 方案或占位资源完成验证。
3. 必须为后续接入正式长离 Live2D 模型保留完整、清晰、稳定的接入点。
4. 不允许因为当前缺少正式长离 Live2D 成品而停止整体开发。
5. 后续会有一个独立的正式长离 Live2D 资产包接入，本轮必须保证“换模型而不重构业务代码”。

最终产品应是一个以长离为主题的 Windows 桌宠，具备：

- Q 版视觉
- 常驻桌面
- 透明背景
- 鼠标拖动
- 点击反馈
- 待机动作
- 随机动作
- 表情切换
- 穿透/取消穿透
- 托盘控制
- 设置窗口
- 气泡反馈
- 可扩展 AI 对话
- 后续正式切换为 Live2D 模型

参考体验方向为“宇痕冫”式桌宠：

- 更 Q
- 更可爱
- 更灵动
- 动作反馈更密集
- 更有陪伴感
- 空闲时不僵硬
- 点击和拖动有明显反馈

不要求逐项复制任何现有项目。

---

# 二、参考资料

允许参考以下两个仓库：

## 1. Amahane-Hikari-Live2D

Repository:

https://github.com/luomo66ccff/Amahane-Hikari-Live2D

参考用途：

- Live2D 资源组织方式
- WebGL viewer（WebGL 查看器）
- 模型验证流程
- model / scripts / skills 分离方式
- Live2D production skill（Live2D 制作技能）设计思路
- asset manifest（资源清单）设计
- sample model 运行验证

不得：

- 直接无脑复制整个仓库
- 将其角色资产视为本项目角色资产
- 把其能正常加载误判为长离视觉效果完成

---

## 2. live2d-from-art

Repository:

https://github.com/fifteen42/live2d-from-art

参考用途：

- artwork-to-Live2D（原画到 Live2D）流程思想
- layer separation（分层）
- hidden-area repair（遮挡区域修复）
- parameter mapping（参数映射）
- browser preview（浏览器预览）
- MOC3 authoring（MOC3 生成）
- 动作、表情、嘴型驱动
- restrained idle motion（克制的待机动画）

注意：

该项目本身不是“万能一键图片转 Live2D 工具”。

即使模型能加载，也不能代表：

- 角色分层正确
- 表情自然
- 动作自然
- 网格合理
- 变形质量达标
- 最终视觉质量达标

因此只能把它作为工作流与工程实现参考。

---

# 三、不可违背的核心原则

## 1. 正式 Live2D 缺失不能阻塞项目

即使现在没有正式长离 Live2D 成品，仍必须继续完成：

- 架构
- 渲染抽象
- 状态机
- 动作系统
- 表情系统
- 资源系统
- 设置系统
- 托盘
- 点击交互
- 拖动交互
- 穿透逻辑
- 气泡逻辑
- 打包
- 测试
- 文档

---

## 2. 角色呈现层与业务层完全解耦

必须把以下内容从主业务逻辑中拆出去：

- renderer（渲染器）
- motion（动作）
- expression（表情）
- parameter driving（参数驱动）
- hit testing（命中检测）
- look target（视线目标）
- drag reaction（拖动反馈）

主业务层不应该关心底层到底使用：

- Layered2D
- Live2D
- sample model
- fallback model

---

## 3. 双渲染后端

至少支持：

### Layered2DRenderer

用于：

- 当前无正式 Live2D 模型时
- 分层 PNG
- 伪 Live2D
- 占位版角色表现

### Live2DRenderer

用于：

- 正式 `.model3.json`
- `.moc3`
- textures
- expressions
- motions
- physics

要求：

上层 CharacterController 不关心底层 renderer 类型。

---

# 四、架构要求

建议至少拆成以下模块：

```text
app/
shell/
window/
tray/
settings/

character-core/
renderer-layered2d/
renderer-live2d/

interaction/
state-machine/
motion/
expression/
speech/

assets/
config/

diagnostics/
tests/
```

如果当前工程技术栈不同，可以按现有项目结构调整，但职责必须保持清晰。

---

# 五、统一角色接口

设计统一接口，名称可以调整，但职责不能缺失。

建议：

```text
CharacterRuntime
CharacterRenderer
CharacterController
CharacterMotionController
CharacterExpressionController
CharacterInteractionController
CharacterAssetPack
CharacterStateMachine
```

至少支持：

```text
loadAssets()
unloadAssets()

setState(state)

playMotion(id)
stopMotion(id)

setExpression(id)

setLookTarget(x, y)

setDragState(active, data)

setSpeech(text)

setMood(mood)

update(deltaTime)

render()
```

---

# 六、Layered2DRenderer 要求

当前没有正式 Live2D 模型时，必须提供可运行占位方案。

支持：

- 透明背景
- 角色缩放
- 呼吸
- 轻微上下浮动
- 轻微左右摇摆
- 自动眨眼
- 鼠标视线跟随
- 点击反馈
- 拖动反馈
- 松手回弹
- 表情切换
- 说话状态
- 睡眠状态
- 随机待机动作

即使素材只是有限的分层 PNG，也要尽量实现：

- 头部轻微旋转
- 身体延迟跟随
- 头发二次摆动
- 饰品延迟摆动
- 呼吸 scale / position 微变化
- 拖动惯性
- 鼠标靠近反馈

目标不是“假装已经做完 Live2D”，而是：

**让桌宠在没有正式 Live2D 时也足够可用、可爱、灵动。**

---

# 七、Live2DRenderer 要求

必须提前把正式 Live2D 接入层做好。

至少支持：

- 加载 `.model3.json`
- 加载 `.moc3`
- 加载 textures
- 加载 expressions
- 加载 motions
- 加载 physics
- 加载 pose（如存在）
- hit area
- parameter driving
- motion trigger
- expression trigger
- look-at
- basic lip sync（如技术上合理）

要求：

1. 当前阶段允许使用官方/sample model 验证。
2. sample model 只能证明运行链路正常。
3. sample model 不得被视为正式长离完成。
4. 模型加载失败必须自动 fallback。
5. 不得因为 Live2D 初始化失败导致整个桌宠崩溃。
6. 必须输出清晰日志。

---

# 八、角色状态机

至少定义：

```text
Idle
RandomIdle
Focused
Hovered
Clicked
Dragged
Speaking
Thinking
Sleeping
Passthrough
Disabled
ErrorFallback
```

状态机要求：

- 有优先级
- 支持打断
- 支持冷却
- 支持防抖
- 支持随机 idle
- 支持动作结束自动回 Idle
- 拖动优先级高于普通点击
- Speaking / Thinking 有独立表现
- Sleeping 应降低随机动作频率

推荐优先级：

```text
Dragged
>
Clicked
>
Speaking / Thinking
>
Focused / Hovered
>
RandomIdle
>
Idle
```

---

# 九、动作系统

动作必须集中管理，不能散落在 UI 回调里。

至少注册以下统一 motion id：

```text
idle_default
idle_breath
idle_blink
idle_look_left_right

tap_head
tap_body

drag_start
dragging
drag_release

happy
angry
surprised
sleepy

speak_short
thinking_loop
```

每个 motion 支持：

- priority
- cooldown
- interruptible
- queue
- random weight
- expression hook
- sound hook
- bubble hook

---

# 十、表情系统

统一 expression registry：

```text
default
happy
playful
angry
dissatisfied
surprised
sleepy
shy
speaking
thinking
```

这些统一 expression id 必须能映射到：

- Layered2D 表现
- Live2D expression
- Live2D 参数组合

---

# 十一、角色资源目录

推荐：

```text
assets/
  characters/
    changli/
      manifest.json
      meta.json

      previews/

      layered2d/
        base/
        parts/
        expressions/
        motions/

      live2d/
        changli.model3.json
        changli.moc3

        textures/

        changli.physics3.json
        changli.pose3.json

        expressions/
        motions/

      config/
        parameter-map.json
        hitareas.json
        motion-map.json
        expression-map.json
```

---

# 十二、manifest.json

设计一个统一 manifest。

建议字段：

```json
{
  "id": "changli",
  "name": "Changli",
  "version": 1,

  "renderers": {
    "layered2d": {
      "enabled": true,
      "entry": "layered2d/"
    },

    "live2d": {
      "enabled": true,
      "entry": "live2d/changli.model3.json"
    }
  },

  "preferredRenderer": "live2d",
  "fallbackRenderer": "layered2d",

  "config": {
    "parameters": "config/parameter-map.json",
    "motions": "config/motion-map.json",
    "expressions": "config/expression-map.json",
    "hitareas": "config/hitareas.json"
  }
}
```

---

# 十三、参数映射

必须避免业务代码直接写：

```text
ParamAngleX
ParamAngleY
ParamEyeLOpen
...
```

应该统一抽象为：

```text
head.x
head.y
head.z

eye.left.open
eye.right.open

eye.x
eye.y

mouth.open
mouth.form

body.x
body.y
body.z

breath
```

再通过：

```text
parameter-map.json
```

映射到具体 Live2D 参数。

示例：

```json
{
  "head.x": "ParamAngleX",
  "head.y": "ParamAngleY",
  "head.z": "ParamAngleZ",

  "eye.left.open": "ParamEyeLOpen",
  "eye.right.open": "ParamEyeROpen",

  "eye.x": "ParamEyeBallX",
  "eye.y": "ParamEyeBallY",

  "mouth.open": "ParamMouthOpenY",
  "mouth.form": "ParamMouthForm",

  "body.x": "ParamBodyAngleX",

  "breath": "ParamBreath"
}
```

正式长离模型以后参数名称不同，也只修改 mapping，不改业务代码。

---

# 十四、正式 Live2D 输入规范

未来正式资源包至少兼容：

```text
changli.model3.json
changli.moc3

textures/*.png

physics3.json
pose3.json

expressions/*.exp3.json

motions/*.motion3.json

userdata3.json
```

其中：

核心必需：

```text
model3.json
moc3
textures
```

可选：

```text
physics3.json
pose3.json
expressions
motions
userdata3.json
```

缺失可选资源不得导致崩溃。

---

# 十五、鼠标交互要求

## Hover

鼠标靠近：

- 轻微看向鼠标
- 眼睛优先移动
- 头部随后轻微跟随
- 不要剧烈转头

## Click

至少区分：

```text
head
body
```

点击后：

- 播放动作
- 切换短暂表情
- 可触发气泡
- 有 cooldown

## Drag

拖动时：

- CharacterState = Dragged
- 身体轻微倾斜
- 头发/饰品延迟
- 有压缩或惯性效果
- 不能像刚性窗口一样僵硬移动

## Release

松手：

- 小幅回弹
- 恢复正常 idle
- 不要过度弹跳

---

# 十六、待机行为

桌宠不能长时间完全静止。

空闲时支持：

- 呼吸
- 眨眼
- 小幅视线移动
- 轻微摆头
- 轻微身体摇摆
- 随机表情
- 随机短动作

随机行为必须：

- 有冷却
- 不频繁打扰
- 不连续疯狂触发
- 根据状态动态调整频率

---

# 十七、说话 / AI 状态

预留：

```text
Thinking
Speaking
```

Thinking：

- 小动作
- 思考表情
- 气泡 loading indicator（加载指示）
- 不需要一直动画很大

Speaking：

- 气泡文本
- 嘴型轻微变化
- 可根据句子长度控制持续时间
- Live2D 模式下以后可升级为音频 lip sync

---

# 十八、设置窗口

至少支持：

- 开机自启
- Always on top（始终置顶）
- 鼠标穿透
- 动作频率
- 音量
- AI 回复
- 气泡
- 角色缩放
- 动画强度
- 渲染模式
- debug mode（调试模式）
- 重置位置
- 资源重载

渲染模式：

```text
Auto
Live2D
Layered2D
```

Auto：

优先 Live2D。

失败时自动 fallback 到 Layered2D。

---

# 十九、系统托盘

至少：

- 显示/隐藏
- 穿透开关
- 设置
- 刷新资源
- 切换 renderer
- 重置位置
- 退出

---

# 二十、多显示器与 DPI

项目后续必须考虑：

- 多显示器
- 不同 DPI
- Windows 缩放比例
- DPI awareness
- 切屏位置
- 屏幕边缘
- 分辨率改变后的恢复

不能只在单个 100% DPI 屏幕测试。

---

# 二十一、资源错误与 fallback

启动流程建议：

```text
读取 character manifest
↓
preferred renderer = Live2D
↓
检查 Live2D 资源完整性
↓
成功
    → Live2DRenderer
失败
    → 记录原因
    → Layered2DRenderer
```

如果 Layered2D 也失败：

```text
ErrorFallback
```

至少显示：

- fallback icon / placeholder
- 日志
- 可进入设置
- 不允许直接崩溃退出

---

# 二十二、日志系统

调试模式应能看到：

```text
Character manifest loaded
Renderer selected
Live2D model path
Model load result
Texture load
Motion load
Expression load
Physics load
Fallback reason
State transition
Motion trigger
Expression trigger
Hit area
```

不要在正常模式下刷屏。

---

# 二十三、测试

必须增加：

## 自动测试

至少：

- manifest parse
- resource path resolve
- renderer selection
- fallback selection
- missing moc3
- missing model3.json
- missing texture
- missing motion
- missing expression
- state transition
- motion registry
- expression registry
- settings serialization

## 手工测试

至少：

- 启动
- 关闭
- 重启
- 拖动
- 点击
- 穿透
- 解除穿透
- 托盘
- 设置窗口
- 角色位置保存
- 重新加载资源
- sample Live2D
- fallback Layered2D

---

# 二十四、文档

本轮完成后必须生成/更新：

```text
README.md
ENGINEERING_HANDOFF.md
LIVE2D_INTEGRATION_GUIDE.md
ASSET_SPEC.md
TEST_REPORT.md
```

---

# 二十五、README.md 内容

必须说明：

- 项目简介
- 当前功能
- 如何运行
- 如何构建
- 如何打包
- 资源目录
- renderer 选择
- Live2D 状态
- Layered2D fallback
- 已知问题

---

# 二十六、ENGINEERING_HANDOFF.md

必须包括：

- 当前架构图
- 模块职责
- 角色系统
- Renderer 抽象
- 状态机
- Motion 系统
- Expression 系统
- 资源系统
- 配置文件
- 已完成项
- 待完成项
- 后续正式 Live2D 接入步骤

---

# 二十七、LIVE2D_INTEGRATION_GUIDE.md

必须包括：

- 正式 Live2D 需要哪些文件
- 每个文件放哪里
- 如何写 manifest
- 如何写 parameter-map
- 如何写 motion-map
- 如何写 expression-map
- 如何配置 hitareas
- 如何替换 sample model
- 如何验证
- 常见错误

---

# 二十八、ASSET_SPEC.md

必须定义：

- character manifest
- preview
- layered2d
- live2d
- texture
- motion
- expression
- parameter mapping
- naming convention
- version convention

---

# 二十九、TEST_REPORT.md

每轮重要改动后更新：

- 自动测试
- Rust 测试（如项目有）
- Frontend 测试（如项目有）
- build
- packaging
- Windows 实机验证
- 未通过项目
- 已知问题

---

# 三十、正式 Live2D 尚未完成时的表现策略

正式模型缺失时：

禁止：

- 停止项目
- 只留一个静态 PNG
- 用“未来会做”作为全部解释

必须：

- 做高质量占位表现
- 呼吸
- 眨眼
- 小幅 sway（摇摆）
- look-at
- 点击
- 拖动
- 回弹
- 表情
- speech state
- idle variety

目标：

虽然不是最终 Live2D，但桌宠已经“像一个成品”。

---

# 三十一、最终正式长离风格

最终正式角色视觉方向：

- Q 版
- 比正式游戏立绘更适合桌宠
- 头身比偏萌
- 面部表情明显
- 眼睛有表现力
- 动作范围不必很大
- 重视细微动态
- 头发与饰品有 secondary motion（二级运动）
- 待机动作自然
- 点击反应明显
- 拖动有物理反馈

体验上参考：

“宇痕冫”风格桌宠的：

- 灵动
- 轻量
- 陪伴感
- 反馈感
- 桌面存在感

不要机械复制任何单个成品的动作资源或程序代码。

---

# 三十二、禁止事项

不得：

1. 因为没有正式 Live2D 而停工。
2. 把 sample model 当作最终长离。
3. 把 Layered2D 写成无法替换的死代码。
4. 把角色资源路径写死在多个地方。
5. 把 motion 逻辑散落在 UI 回调。
6. 把 expression 写死在业务代码。
7. 让 Live2D 初始化失败拖垮主程序。
8. 无脑复制参考仓库。
9. 引入授权不清晰的第三方角色资产进入最终分发包。
10. 只追求“能跑”，而忽略可维护性。

---

# 三十三、本轮执行优先级

严格按此顺序：

```text
P0
现有阻塞 bug
启动
窗口
拖动
资源加载
崩溃

P1
Character abstraction

P2
Layered2DRenderer

P3
Live2DRenderer + sample model

P4
StateMachine

P5
Motion + Expression

P6
Mouse interaction

P7
Settings

P8
Tray

P9
Fallback + diagnostics

P10
Tests + build + packaging

P11
Documentation

P12
体验打磨
```

---

# 三十四、本轮验收标准

## A. 架构

- Character 系统统一
- renderer 可替换
- 正式模型缺失仍可运行
- 后续换模型无需重构主逻辑

## B. 桌宠能力

必须至少具备：

- 透明显示
- 拖动
- 点击反馈
- 待机动画
- 表情
- 穿透
- 设置
- 托盘
- 位置保存

## C. Live2D

必须：

- 完成 renderer 接入层
- 能用 sample model 验证
- 支持 model3 / moc3 / textures
- 准备 motion / expression / parameter mapping
- 支持 fallback

## D. 文档

必须：

- README
- HANDOFF
- Live2D guide
- Asset spec
- Test report

---

# 三十五、最终汇报格式

每轮结束必须输出：

## 1. 已完成

- 功能
- 架构
- 文档
- 测试

## 2. 改动文件

列出关键文件。

## 3. 当前运行方式

包括：

- 启动方式
- 开发模式
- build
- package

## 4. Renderer 状态

说明：

- Layered2D
- Live2D
- sample model
- fallback

## 5. 当前已知问题

明确列出。

## 6. 下一步

最多给出 3～5 个最重要事项。

不要给泛泛而谈的下一步。

---

# 三十六、正式 Live2D 资源接入契约

未来正式长离 Live2D 资源包到位时，应能按照：

```text
assets/characters/changli/live2d/
```

直接接入。

最低文件：

```text
changli.model3.json
changli.moc3
textures/
```

推荐文件：

```text
changli.physics3.json

expressions/
motions/
```

接入流程：

```text
复制正式资源
↓
更新 manifest
↓
更新 parameter-map
↓
更新 motion-map
↓
更新 expression-map
↓
运行 asset validation
↓
启动程序
↓
验证 hit areas
↓
验证动作
↓
验证表情
↓
验证 physics
↓
验证 fallback
```

不允许为换正式角色重新写一套主业务逻辑。

---

# 三十七、关于正式 Live2D 模型制作职责

正式长离 Live2D 模型将作为独立制作阶段完成。

因此：

Codex 当前职责是：

- 设计接入规范
- 完成运行时
- 完成 renderer
- 完成参数驱动
- 完成 motion / expression 映射
- 完成 sample 验证
- 完成最终模型接入口

不要因为暂时没有正式模型就试图把程序任务全部转化成“等待建模”。

同时，未来模型完成后：

Codex 必须能够立即完成：

- 导入
- 映射
- 调试
- 动作连接
- 表情连接
- 交互连接
- 性能优化

---

# 三十八、一句话总目标

> **把这个项目做成：现在没有正式长离 Live2D 模型也已经是一款完整可运行、可爱、灵动的桌宠；未来正式 Live2D 资源一到，只需要完成资源接入与参数映射，就能升级成最终正式版本。**

立即按照本文件执行。

不要再次以“正式 Live2D 模型尚未完成”为理由停止工程侧工作。
