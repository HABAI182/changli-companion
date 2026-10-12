#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod desktop;
mod gamepad;
mod input;
mod model;
mod pet_menu;
mod storage;
mod windows;
use serde::{Deserialize, Serialize};
use std::{str::FromStr, sync::Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, LogicalSize, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_autostart::ManagerExt as AutostartExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
struct Settings {
    #[serde(rename = "settingsTheme")]
    settings_theme: String,
    #[serde(rename = "accentColor")]
    accent_color: String,
    #[serde(rename = "settingsDensity")]
    settings_density: String,
    #[serde(rename = "cursorFollowEnabled")]
    cursor_follow_enabled: bool,
    #[serde(rename = "headElasticity")]
    head_elasticity: f64,
    #[serde(rename = "keyboardMotionScale")]
    keyboard_motion_scale: f64,
    #[serde(rename = "mouseMotionScale")]
    mouse_motion_scale: f64,
    #[serde(rename = "bubbleDurationSeconds")]
    bubble_duration_seconds: f64,
    #[serde(rename = "bubbleIdleIntervalSeconds")]
    bubble_idle_interval_seconds: u32,
    #[serde(rename = "dragReactionsEnabled")]
    drag_reactions_enabled: bool,
    #[serde(rename = "fullscreenHideEnabled")]
    fullscreen_hide_enabled: bool,
    #[serde(rename = "fullscreenExceptions")]
    fullscreen_exceptions: Vec<String>,
    #[serde(rename = "edgeSnapEnabled")]
    edge_snap_enabled: bool,
    #[serde(rename = "mouseDetailsEnabled")]
    mouse_details_enabled: bool,
    scale: f64,
    topmost: bool,
    passthrough: bool,
    motion: String,
    #[serde(rename = "rendererMode")]
    renderer_mode: String,
    #[serde(rename = "bubblesEnabled")]
    bubbles_enabled: bool,
    fps: u32,
    autostart: bool,
    shortcut: String,
    #[serde(rename = "inputMode")]
    input_mode: String,
    #[serde(rename = "keyOverlayEnabled")]
    key_overlay_enabled: bool,
    #[serde(rename = "autoSleepMinutes")]
    auto_sleep_minutes: u32,
    #[serde(rename = "hoverHideEnabled")]
    hover_hide_enabled: bool,
    #[serde(rename = "hoverHideDelayMs")]
    hover_hide_delay_ms: u32,
    #[serde(rename = "hoverHideOpacity")]
    hover_hide_opacity: f64,
    #[serde(rename = "gamepadEnabled")]
    gamepad_enabled: bool,
    #[serde(rename = "sfxEnabled")]
    sfx_enabled: bool,
    #[serde(rename = "sfxVolume")]
    sfx_volume: f64,
    #[serde(rename = "voiceEnabled")]
    voice_enabled: bool,
    #[serde(rename = "voiceVolume")]
    voice_volume: f64,
    #[serde(rename = "keyboardSfxEnabled")]
    keyboard_sfx_enabled: bool,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            settings_theme: "system".into(),
            accent_color: "coral".into(),
            settings_density: "comfortable".into(),
            cursor_follow_enabled: true,
            head_elasticity: 1.0,
            keyboard_motion_scale: 1.0,
            mouse_motion_scale: 1.0,
            bubble_duration_seconds: 3.0,
            bubble_idle_interval_seconds: 90,
            drag_reactions_enabled: true,
            fullscreen_hide_enabled: true,
            fullscreen_exceptions: Vec::new(),
            edge_snap_enabled: true,
            mouse_details_enabled: true,
            scale: 1.0,
            topmost: true,
            passthrough: false,
            motion: "full".into(),
            renderer_mode: "auto".into(),
            bubbles_enabled: true,
            fps: 30,
            autostart: false,
            shortcut: "Ctrl+Shift+F10".into(),
            input_mode: "keyboard_mouse".into(),
            key_overlay_enabled: true,
            auto_sleep_minutes: 0,
            hover_hide_enabled: false,
            hover_hide_delay_ms: 500,
            hover_hide_opacity: 0.4,
            gamepad_enabled: false,
            sfx_enabled: false,
            sfx_volume: 0.35,
            voice_enabled: false,
            voice_volume: 0.5,
            keyboard_sfx_enabled: false,
        }
    }
}
struct Runtime {
    settings: Mutex<Settings>,
    shortcut: Mutex<Option<Shortcut>>,
    warning: Mutex<String>,
    bindings: Mutex<Vec<(Shortcut, model::Binding)>>,
    slots: Mutex<Vec<model::Binding>>,
}
const RECOVERY_FALLBACKS: [&str; 3] = ["Ctrl+Shift+F10", "Ctrl+Shift+F11", "Ctrl+Shift+F12"];
#[derive(Clone, Serialize)]
struct ShortcutCommand {
    action: model::Action,
    trigger: String,
    pressed: bool,
}
#[derive(Serialize)]
struct SlotUpdate {
    slots: Vec<model::Binding>,
    errors: Vec<String>,
}
// Keep the previous shortcut registered until its replacement is secured.
// This also makes a failed slot update independent of the other 24 slots.
fn replace_binding<R, U>(
    bindings: &mut Vec<(Shortcut, model::Binding)>,
    candidate: &model::Binding,
    register: R,
    unregister: U,
) -> Result<(), String>
where
    R: Fn(Shortcut) -> Result<(), String>,
    U: Fn(Shortcut) -> Result<(), String>,
{
    let old_position = bindings
        .iter()
        .position(|(_, binding)| binding.id == candidate.id);
    let old_key = old_position.map(|position| bindings[position].0);
    let new_key = if candidate.enabled {
        Some(Shortcut::from_str(&candidate.shortcut).map_err(|e| e.to_string())?)
    } else {
        None
    };
    if old_key == new_key {
        if let Some(position) = old_position {
            bindings[position].1 = candidate.clone();
        }
        return Ok(());
    }
    if let Some(key) = new_key {
        register(key)?;
    }
    if let Some(key) = old_key {
        if let Err(error) = unregister(key) {
            if let Some(new_key) = new_key {
                let _ = unregister(new_key);
            }
            return Err(error);
        }
    }
    if let Some(position) = old_position {
        bindings.remove(position);
    }
    if let Some(key) = new_key {
        bindings.push((key, candidate.clone()));
    }
    Ok(())
}
#[cfg(test)]
mod shortcut_tests {
    use super::*;
    use std::cell::RefCell;

    fn binding(id: &str, key: &str) -> model::Binding {
        model::Binding {
            id: id.into(),
            enabled: true,
            shortcut: key.into(),
            expression: "smile".into(),
            mode: "toggle".into(),
            trigger: "toggle".into(),
            action: model::Action {
                kind: "expression".into(),
                id: "smile".into(),
            },
        }
    }

    #[test]
    fn conflicting_replacement_preserves_old_and_does_not_block_other_slot() {
        let old = binding("slot-01", "Ctrl+Alt+1");
        let old_key = Shortcut::from_str(&old.shortcut).unwrap();
        let active = RefCell::new(vec![old_key]);
        let mut bindings = vec![(old_key, old)];
        let blocked = binding("slot-01", "Ctrl+Alt+2");
        assert!(replace_binding(
            &mut bindings,
            &blocked,
            |_key| Err("occupied".into()),
            |_key| unreachable!(),
        )
        .is_err());
        assert_eq!(bindings[0].1.shortcut, "Ctrl+Alt+1");
        assert_eq!(*active.borrow(), vec![old_key]);

        let independent = binding("slot-02", "Ctrl+Alt+3");
        replace_binding(
            &mut bindings,
            &independent,
            |key| {
                active.borrow_mut().push(key);
                Ok(())
            },
            |_key| Ok(()),
        )
        .unwrap();
        assert_eq!(bindings.len(), 2);
        assert_eq!(bindings[1].1.id, "slot-02");
    }
}
#[tauri::command]
fn list_shortcuts(app: tauri::AppHandle) -> Result<Vec<model::Binding>, String> {
    app.state::<Runtime>()
        .slots
        .lock()
        .map(|s| s.clone())
        .map_err(|_| "快捷键锁失败".into())
}
#[tauri::command]
fn update_shortcuts(
    app: tauri::AppHandle,
    requested: Vec<model::Binding>,
) -> Result<SlotUpdate, String> {
    if requested.len() != 25 {
        return Err("必须提交 25 个动作槽".into());
    }
    let runtime = app.state::<Runtime>();
    let recovery = runtime
        .settings
        .lock()
        .map_err(|_| "设置锁失败")?
        .shortcut
        .clone();
    let mut slots = runtime.slots.lock().map_err(|_| "快捷键锁失败")?;
    let mut bindings = runtime.bindings.lock().map_err(|_| "快捷键锁失败")?;
    let mut errors = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for (index, candidate) in requested.into_iter().enumerate() {
        let expected = format!("slot-{:02}", index + 1);
        if candidate.id != expected
            || !["toggle", "hold", "once"].contains(&candidate.trigger.as_str())
            || !["expression", "animation", "effect", "voice", "compound"]
                .contains(&candidate.action.kind.as_str())
            || candidate.action.id.len() > 80
            || candidate.action.id.trim().is_empty()
            || candidate.shortcut.len() > 80
        {
            errors.push(format!("{} 配置格式无效", expected));
            continue;
        }
        if candidate.enabled {
            if ["voice", "compound"].contains(&candidate.action.kind.as_str()) {
                errors.push(format!("{} 语音/组合资源尚未接入", expected));
                continue;
            }
            if candidate.shortcut.trim().is_empty()
                || candidate.shortcut.eq_ignore_ascii_case(&recovery)
                || !seen.insert(candidate.shortcut.to_ascii_lowercase())
            {
                errors.push(format!("{} 快捷键为空、重复或占用恢复键", expected));
                continue;
            }
        }
        if replace_binding(
            &mut bindings,
            &candidate,
            |key| {
                app.global_shortcut()
                    .register(key)
                    .map_err(|e| e.to_string())
            },
            |key| {
                app.global_shortcut()
                    .unregister(key)
                    .map_err(|e| e.to_string())
            },
        )
        .is_err()
        {
            if candidate.enabled {
                seen.remove(&candidate.shortcut.to_ascii_lowercase());
            }
            errors.push(format!("{} 快捷键格式无效或被其他程序占用", expected));
            continue;
        }
        slots[index] = candidate;
    }
    model::save_shortcuts(&app, &slots)?;
    Ok(SlotUpdate {
        slots: slots.clone(),
        errors,
    })
}
#[tauri::command]
fn reset_position(app: tauri::AppHandle) -> Result<(), String> {
    windows::fit(&app, None, true)
}

#[tauri::command]
async fn open_panel(app: tauri::AppHandle, panel: String) -> Result<(), String> {
    if panel != "settings" {
        return Err("未知面板".into());
    }
    let label = format!("panel-{panel}");
    if let Some(w) = app.get_webview_window(&label) {
        input::register_editor(&w);
        w.set_always_on_top(true).map_err(|e| e.to_string())?;
        w.show().map_err(|e| e.to_string())?;
        return w.set_focus().map_err(|e| e.to_string());
    }
    let settings_window = WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::App(format!("index.html?panel={panel}").into()),
    )
    .title("离火长明 · 桌宠设置")
    .inner_size(560.0, 760.0)
    .min_inner_size(420.0, 500.0)
    .center()
    .focused(true)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;
    input::register_editor(&settings_window);
    Ok(())
}
#[tauri::command]
fn hide_pet(app: tauri::AppHandle) -> Result<(), String> {
    desktop::manual_visible(&app, false)
}
#[tauri::command]
fn open_project_link(page: String) -> Result<(), String> {
    let url = match page.as_str() {
        "home" => "https://github.com/HABAI182/changli-companion",
        "updates" => "https://github.com/HABAI182/changli-companion/releases",
        _ => return Err("未知项目链接".into()),
    };
    std::process::Command::new("explorer.exe")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("打开浏览器失败：{e}"))
}
#[tauri::command]
fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    windows::save_now(&app)?;
    app.exit(0);
    Ok(())
}
fn recover(app: &tauri::AppHandle) -> Result<(), String> {
    let w = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
    w.set_ignore_cursor_events(false)
        .map_err(|e| e.to_string())?;
    app.state::<Runtime>()
        .settings
        .lock()
        .map_err(|_| "设置锁失败")?
        .passthrough = false;
    windows::fit(app, None, false)?;
    desktop::manual_visible(app, true)?;
    storage::recover_passthrough(app)
}
#[tauri::command]
fn animate(app: tauri::AppHandle, signal: String) -> Result<(), String> {
    if !["complete", "enter"].contains(&signal.as_str()) {
        return Err("不支持的动作".into());
    }
    app.emit_to("pet", "companion-action", signal)
        .map_err(|e| e.to_string())
}
fn apply_window(app: &tauri::AppHandle, s: &Settings) -> Result<(), String> {
    let w = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
    w.set_always_on_top(s.topmost).map_err(|e| e.to_string())?;
    // Raising the pet while saving must not cover its own visible settings.
    if let Some(panel) = app.get_webview_window("panel-settings") {
        if panel.is_visible().map_err(|e| e.to_string())? {
            panel.set_always_on_top(true).map_err(|e| e.to_string())?;
            panel.set_focus().map_err(|e| e.to_string())?;
        }
    }
    w.set_size(LogicalSize::new(360.0 * s.scale, 320.0 * s.scale))
        .map_err(|e| e.to_string())?;
    w.set_ignore_cursor_events(s.passthrough)
        .map_err(|e| e.to_string())?;
    windows::fit(app, None, false)?;
    let manager = app.autolaunch();
    let enabled = manager.is_enabled().map_err(|e| e.to_string())?;
    if s.autostart && !enabled {
        manager.enable().map_err(|e| e.to_string())?;
    } else if !s.autostart && enabled {
        manager.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Size previews resize only the pet. Persistence, startup and recovery-key
// changes are handled once when the slider is committed.
#[tauri::command]
fn preview_scale(app: tauri::AppHandle, scale: f64) -> Result<(), String> {
    if !scale.is_finite() || !(0.5..=2.0).contains(&scale) {
        return Err("角色大小必须在50%到200%之间".into());
    }
    let pet = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
    pet.set_size(LogicalSize::new(360.0 * scale, 320.0 * scale))
        .map_err(|e| e.to_string())?;
    windows::fit(&app, None, false)
}
#[tauri::command]
fn apply_settings(app: tauri::AppHandle, mut settings: Settings) -> Result<Settings, String> {
    if !settings.scale.is_finite()
        || settings.scale < 0.5
        || settings.scale > 2.0
        || ![30, 60].contains(&settings.fps)
        || !["keyboard_mouse", "keyboard_only"].contains(&settings.input_mode.as_str())
        || !["full", "low", "off"].contains(&settings.motion.as_str())
        || !["system", "light", "dark"].contains(&settings.settings_theme.as_str())
        || !["coral", "blue", "violet", "sage"].contains(&settings.accent_color.as_str())
        || !["comfortable", "compact"].contains(&settings.settings_density.as_str())
        || !settings.head_elasticity.is_finite()
        || !(0.0..=1.5).contains(&settings.head_elasticity)
        || !settings.keyboard_motion_scale.is_finite()
        || !(0.5..=1.25).contains(&settings.keyboard_motion_scale)
        || !settings.mouse_motion_scale.is_finite()
        || !(0.0..=1.5).contains(&settings.mouse_motion_scale)
        || !settings.bubble_duration_seconds.is_finite()
        || !(2.0..=8.0).contains(&settings.bubble_duration_seconds)
        || ![0, 60, 90, 180].contains(&settings.bubble_idle_interval_seconds)
        || !["auto", "live2d", "layered2d"].contains(&settings.renderer_mode.as_str())
        || ![0, 5, 10, 15].contains(&settings.auto_sleep_minutes)
        || ![250, 500, 1000].contains(&settings.hover_hide_delay_ms)
        || ![0.2, 0.4, 0.6].contains(&settings.hover_hide_opacity)
        || !settings.sfx_volume.is_finite()
        || !(0.0..=1.0).contains(&settings.sfx_volume)
        || !settings.voice_volume.is_finite()
        || !(0.0..=1.0).contains(&settings.voice_volume)
        || settings.fullscreen_exceptions.len() > 32
        || settings.fullscreen_exceptions.iter().any(|e| {
            e.len() > 128
                || !e.to_ascii_lowercase().ends_with(".exe")
                || e.contains(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])
        })
    {
        return Err("设置值超出范围".into());
    }
    let requested = Shortcut::from_str(&settings.shortcut)
        .map_err(|_| "快捷键格式无效，例如 Ctrl+Shift+F10")?;
    let runtime = app.state::<Runtime>();
    let mut current = runtime.settings.lock().map_err(|_| "设置锁失败")?;
    let mut registered = runtime.shortcut.lock().map_err(|_| "快捷键锁失败")?;
    let changed = registered.as_ref() != Some(&requested);
    let mut effective = requested;
    let mut warning = String::new();
    // Register the replacement before removing the previous shortcut. During normal
    // settings changes a conflict keeps the old recovery shortcut. On first launch
    // there is no old shortcut, so fall back to a small known-safe candidate set.
    if changed && app.global_shortcut().register(requested).is_err() {
        if registered.is_some() {
            return Err("快捷键已被占用或不可注册；原快捷键仍保留，亦可从托盘恢复".into());
        }
        let mut fallback = None;
        for text in RECOVERY_FALLBACKS {
            if text == settings.shortcut {
                continue;
            }
            if let Ok(candidate) = Shortcut::from_str(text) {
                if app.global_shortcut().register(candidate).is_ok() {
                    fallback = Some((candidate, text));
                    break;
                }
            }
        }
        let Some((candidate, text)) = fallback else {
            return Err("恢复快捷键均被占用或不可注册；请使用系统托盘恢复互动".into());
        };
        effective = candidate;
        settings.shortcut = text.into();
        warning = format!(" 保存的恢复快捷键不可用，已改用 {text}。");
    }
    if let Err(e) = apply_window(&app, &settings) {
        if changed {
            let _ = app.global_shortcut().unregister(effective);
        }
        let _ = apply_window(&app, &current);
        return Err(e);
    }
    if changed {
        if let Some(old) = registered.take() {
            let _ = app.global_shortcut().unregister(old);
        }
        *registered = Some(effective);
    }
    *current = settings.clone();
    *runtime.warning.lock().map_err(|_| "状态锁失败")? = warning;
    Ok(settings)
}
#[tauri::command]
fn native_status(app: tauri::AppHandle) -> String {
    let active = input::ACTIVE.load(std::sync::atomic::Ordering::Relaxed);
    let warning = app
        .state::<Runtime>()
        .warning
        .lock()
        .map(|s| s.clone())
        .unwrap_or_default();
    format!(
        "{}。本地 SQLite 存储；托盘可恢复互动。{}{}{}",
        if active {
            "键鼠监听已注册（跨应用效果需实机验收）"
        } else {
            "键鼠监听未启动或注册失败"
        },
        warning,
        input::summary(),
        gamepad::summary()
    )
}
fn main() {
    if std::env::current_exe()
        .ok()
        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
        .as_deref()
        == Some("changli-companion-fullscreen-test.exe")
    {
        desktop::run_fullscreen_fixture();
        return;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    let runtime = app.state::<Runtime>();
                    let is_recovery = runtime
                        .shortcut
                        .lock()
                        .map(|s| s.as_ref() == Some(shortcut))
                        .unwrap_or(false);
                    if is_recovery {
                        if event.state() == ShortcutState::Pressed {
                            let _ = recover(app);
                        }
                        return;
                    }
                    if let Ok(bindings) = runtime.bindings.lock() {
                        if let Some((_, binding)) = bindings.iter().find(|(key, _)| key == shortcut)
                        {
                            let _ = app.emit(
                                "shortcut-command",
                                ShortcutCommand {
                                    action: binding.action.clone(),
                                    trigger: binding.trigger.clone(),
                                    pressed: event.state() == ShortcutState::Pressed,
                                },
                            );
                        }
                    };
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            desktop::begin_pet_drag,
            desktop::finish_pet_drag,
            desktop::list_pet_positions,
            desktop::save_pet_position,
            desktop::restore_pet_position,
            open_panel,
            hide_pet,
            quit_app,
            animate,
            reset_position,
            apply_settings,
            open_project_link,
            pet_menu::open_pet_menu,
            pet_menu::drag_pet_menu,
            pet_menu::close_pet_menu,
            pet_menu::menu_action,
            preview_scale,
            native_status,
            list_shortcuts,
            update_shortcuts,
            storage::load_data,
            storage::save_data
        ])
        .setup(|app| {
            app.manage(desktop::DesktopState::default());
            app.manage(storage::initialize(app.handle())?);
            let saved = storage::load_data(app.state())?
                .json
                .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
                .and_then(|v| serde_json::from_value::<Settings>(v["settings"].clone()).ok())
                .unwrap_or_default();
            let model = model::initialize(app.handle())?;
            app.manage(Runtime {
                settings: Mutex::new(Settings::default()),
                shortcut: Mutex::new(None),
                warning: Mutex::new(String::new()),
                bindings: Mutex::new(Vec::new()),
                slots: Mutex::new(model.shortcuts.clone()),
            });
            let show = MenuItem::with_id(app, "show", "显示 / 隐藏", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let restore = MenuItem::with_id(app, "recover", "关闭穿透并显示", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let top = MenuItem::with_id(app, "topmost", "切换置顶", true, None::<&str>)?;
            let km = MenuItem::with_id(app, "keyboard_mouse", "键鼠模式", true, None::<&str>)?;
            let ko = MenuItem::with_id(app, "keyboard_only", "纯键盘模式", true, None::<&str>)?;
            let reset = MenuItem::with_id(app, "reset", "重置位置", true, None::<&str>)?;
            let reload = MenuItem::with_id(app, "reload", "重新加载角色渲染", true, None::<&str>)?;
            let renderer = MenuItem::with_id(app, "renderer", "切换渲染模式", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &show, &top, &km, &ko, &settings, &renderer, &reload, &restore, &reset, &quit,
                ],
            )?;
            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .expect("bundled Changli icon")
                        .clone(),
                )
                .tooltip("离火长明 · 恢复桌宠")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("pet") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = desktop::manual_visible(app, false);
                            } else {
                                let _ = windows::fit(app, None, false);
                                let _ = desktop::manual_visible(app, true);
                            }
                        }
                    }
                    "settings" => {
                        // WebView2 creation must not block the Windows event handler.
                        let handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = open_panel(handle, "settings".into()).await;
                        });
                    }
                    "recover" => {
                        let _ = recover(app);
                    }
                    "reset" => {
                        let _ = reset_position(app.clone());
                    }
                    "reload" => {
                        let _ = app.emit("reload-character-resources", ());
                    }
                    "renderer" => {
                        if let Ok(mut s) = app.state::<Runtime>().settings.lock() {
                            s.renderer_mode = match s.renderer_mode.as_str() {
                                "auto" => "layered2d",
                                "layered2d" => "live2d",
                                _ => "auto",
                            }
                            .into();
                            let _ = storage::update_setting(
                                app,
                                "rendererMode",
                                s.renderer_mode.clone().into(),
                            );
                        }
                    }
                    "keyboard_mouse" | "keyboard_only" => {
                        let mode = event.id.as_ref();
                        if let Ok(mut s) = app.state::<Runtime>().settings.lock() {
                            s.input_mode = mode.into();
                        }
                        let _ = storage::update_setting(app, "inputMode", mode.into());
                    }
                    "topmost" => {
                        let value = app
                            .state::<Runtime>()
                            .settings
                            .lock()
                            .map(|s| !s.topmost)
                            .unwrap_or(true);
                        if let Some(w) = app.get_webview_window("pet") {
                            if w.set_always_on_top(value).is_ok() {
                                if let Ok(mut s) = app.state::<Runtime>().settings.lock() {
                                    s.topmost = value;
                                }
                                let _ = storage::update_setting(app, "topmost", value.into());
                            }
                        }
                    }
                    "quit" => {
                        let _ = windows::save_now(app);
                        app.exit(0)
                    }
                    _ => {}
                })
                .build(app)?;
            let requested_shortcut = saved.shortcut.clone();
            match apply_settings(app.handle().clone(), saved) {
                Ok(effective) => {
                    if effective.shortcut != requested_shortcut {
                        let _ = storage::update_setting(
                            app.handle(),
                            "shortcut",
                            effective.shortcut.into(),
                        );
                    }
                }
                Err(e) => {
                    *app.state::<Runtime>().warning.lock().unwrap() = e;
                    let _ = recover(app.handle());
                }
            }
            for binding in model.shortcuts {
                if !binding.enabled || binding.shortcut.trim().is_empty() {
                    continue;
                }
                match Shortcut::from_str(&binding.shortcut) {
                    Ok(key) => {
                        if app.global_shortcut().register(key).is_ok() {
                            app.state::<Runtime>()
                                .bindings
                                .lock()
                                .unwrap()
                                .push((key, binding));
                        } else {
                            app.state::<Runtime>()
                                .warning
                                .lock()
                                .unwrap()
                                .push_str(&format!(
                                    " 表情快捷键 {} 冲突，已跳过。",
                                    binding.shortcut
                                ));
                        }
                    }
                    Err(_) => {
                        app.state::<Runtime>()
                            .warning
                            .lock()
                            .unwrap()
                            .push_str(" model.json 中有无效快捷键，已跳过。");
                    }
                }
            }
            windows::restore(app.handle())?;
            if let Some(w) = app.get_webview_window("pet") {
                w.show()?;
            }
            input::start(app.handle().clone());
            gamepad::start(app.handle().clone());
            windows::watch(app.handle().clone());
            desktop::watch(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("离火长明启动失败，请检查 WebView2 和本地数据目录权限");
}
