# Codex 接手说明｜离火长明 Phase 1

日期：2026-09-24

> 2026-09-25 续接说明：下文为收到的原始交接背景。Rust / MSVC / SDK 现已安装，原生编译和 NSIS 打包已完成。继续工作时优先读取最新 `TEST-REPORT.md` 与 `MERGE-REVIEW.md`，不要重复安装工具链，也不要把下文的历史阻塞当成当前状态。

## 先做什么

先完整阅读以下文件，再开始任何修改：

1. `specs/FINAL-SPEC.md`
2. `README.md`
3. `TEST-REPORT.md`
4. `HANDOFF-2026-09-24.md`
5. 本文件 `CODEX-HANDOFF.md`

不要重复已经完成的工作，不要直接开始 Phase 2/3。当前目标是：**把现有 Phase 1 在 Windows 上真正编译、启动、验证并收口。**

## 当前工程状态

- 技术栈：React + Vite + TypeScript + Tauri 2 + Rust。
- 前端基础逻辑、待办、专注、设置、模型配置、浏览器预览已存在。
- 原生层已经有透明无边框窗口、置顶、非聚焦、SQLite、位置恢复、多屏修正、Windows 全局键鼠 hook、系统托盘、恢复快捷键、鼠标穿透和开机启动等实现。
- 原始测试记录：TypeScript、25 项单测、前端 build、格式检查通过；但 Windows 原生端因为缺 Rust/Cargo + MSVC/Windows SDK，没有完成真正编译和 EXE 打包。
- 美术/动作层仍明显未完成：正式左右手帧、鼠标帧、眨眼/呼吸、8 套表情、2 套完整动画均未验收；当前四个基础状态主要共享同一张 PNG。

## 上一位助手已经做的修改

### 1. 恢复快捷键首次启动兜底

涉及：`src-tauri/src/main.rs`

- 运行中更换恢复快捷键发生冲突时，继续保留旧快捷键。
- 首次启动时没有旧快捷键可保留，如果保存的快捷键无法注册，则按顺序尝试：
  - `Ctrl+Shift+F10`
  - `Ctrl+Shift+F11`
  - `Ctrl+Shift+F12`
- 如果采用回退键，会把实际生效值写回设置，避免 UI/运行时不一致。

### 2. apply_settings 返回实际生效设置

涉及：

- `src-tauri/src/main.rs`
- `src/native.ts`
- `src/App.tsx`

Rust `apply_settings` 现在返回 `Settings`。前端保存返回后的实际设置，而不是盲目保存用户原始请求值。

### 3. 新增本机验证脚本

新增：

- `Verify-Phase1.cmd`
- `Verify-Phase1.ps1`

用途：检查 Node/npm、TypeScript、单元测试、Prettier、前端 build、Rustfmt、cargo test、Tauri info、MSVC 和 Windows SDK。传 `-Package` 时额外尝试 Windows NSIS 打包。

脚本不会自动安装工具链。

## 重要验证边界

上述修改是在没有 Windows Rust 工具链的环境中完成的，因此：

- 不要假定 Rust 修改已经编译通过。
- 不要假定 Windows 原生行为已经验证。
- 先在用户 Windows 机器运行 `Verify-Phase1.cmd`。
- 工具链齐全后再运行：

```powershell
./Verify-Phase1.ps1 -Package
```

然后运行：

```powershell
npm run desktop
```

## 下一步优先级

严格按此顺序处理，除非实机结果迫使调整：

1. 跑 `Verify-Phase1.cmd`，记录完整输出。
2. 如果缺 Rust/MSVC/Windows SDK，只处理工具链阻塞；不要顺手扩功能。
3. Rust/TS/测试/build/打包失败时，修到通过，并说明每个失败的根因。
4. 启动桌面版，人工验收：
   - 透明窗口
   - 无边框
   - 不抢焦点
   - 置顶
   - 全局键盘左右区域响应
   - 鼠标输入响应
   - 拖动
   - 穿透与恢复快捷键
   - 托盘恢复
   - 设置保存
   - 重启位置恢复
   - 中文输入法编辑设置/待办
   - 多屏 / 不同 DPI / 断开显示器后恢复可见
5. 只有上述原生骨架稳定后，再开始正式动作素材层。

## 暂时不要做

除非 `FINAL-SPEC.md` 明确要求进入后续阶段，否则不要提前实现：

- Phase 2/3
- 手柄
- 语音
- 音效
- 25 槽完整编辑器
- 模型导入
- 自动更新
- 更复杂视线跟随
- 将 Enter/Backspace 等高级动作硬接进 Phase 1
- Live2D 完整接入

## 已知值得继续关注的工程点

这些不是都要求现在修；先以实机和测试结果为准：

- `src-tauri/src/storage.rs` 中部分托盘设置更新走整体读取/写回路径，与前端 CAS 并发模型可能不完全一致；如果实机或代码审查确认存在覆盖风险，再收敛到一致的原子更新策略。
- Windows 全局输入当前主要用于 Phase 1 的左右键区/鼠标语义；不要为了“看起来更完整”过早扩到高级动作。
- 真实全局 hook、管理员窗口、受保护应用、远程桌面、系统 hook 超时、IME、不抢焦点等都必须以 Windows 实机为准。

## 工作方式要求

- 先读代码和规格，再改。
- 每次修改尽量小步、可验证。
- 不要把“代码存在”写成“功能已验收”。
- 不要把浏览器预览结果当成 Windows 原生验收。
- 修改后更新 `TEST-REPORT.md`，明确区分：已通过 / 失败 / 未测。
- 若有 Git 仓库，先查看 `git status`、`git diff` 和最近提交；当前交接 ZIP 本身不保证包含 `.git` 历史。

## 建议的第一条 Codex 指令

> 先不要修改代码。完整读取 `specs/FINAL-SPEC.md`、`README.md`、`TEST-REPORT.md`、`HANDOFF-2026-09-24.md` 和 `CODEX-HANDOFF.md`，再查看当前仓库状态和关键源码。确认上一轮快捷键兜底、`apply_settings` 返回实际设置、`Verify-Phase1` 验证脚本是否都存在且实现一致。随后只执行 Phase 1 收口：先运行验证脚本并根据实际失败修复，不扩 Phase 2/3。每完成一个阶段都更新测试记录，禁止把未实机验证的 Windows 功能写成已通过。
