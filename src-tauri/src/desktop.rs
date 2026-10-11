use crate::{storage::Database, windows, Runtime};
use serde::Serialize;
use std::sync::{atomic::{AtomicBool, Ordering}, Mutex};
use tauri::{Manager, PhysicalPosition};

#[derive(Default)]
struct Visibility { manual_hidden: bool, auto_hidden: bool, override_fullscreen: bool }
#[derive(Default)]
pub struct DesktopState {
    pub dragging: AtomicBool,
    visibility: Mutex<Visibility>,
}

pub fn manual_visible(app: &tauri::AppHandle, visible: bool) -> Result<(), String> {
    let desktop = app.state::<DesktopState>();
    let mut state = desktop.visibility.lock().map_err(|_| "桌面状态锁失败")?;
    let pet = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
    if visible { pet.show() } else { pet.hide() }.map_err(|e| e.to_string())?;
    state.manual_hidden = !visible;
    state.auto_hidden = false;
    state.override_fullscreen = visible;
    Ok(())
}

// Signed physical coordinates also support monitors to the left of the primary.
pub fn snap_axis(value: i32, start: i32, length: u32, size: u32, distance: i32, inset: i32) -> i32 {
    let end = start + length.saturating_sub(size) as i32;
    let value = value.clamp(start, end);
    let margin = inset.min((end - start) / 2).max(0);
    if value - start <= distance { start + margin }
    else if end - value <= distance { end - margin }
    else { value }
}

#[tauri::command]
pub fn begin_pet_drag(app: tauri::AppHandle) {
    app.state::<DesktopState>().dragging.store(true, Ordering::Relaxed);
}
#[tauri::command]
pub fn finish_pet_drag(app: tauri::AppHandle) -> Result<(), String> {
    // Clear even if monitor/window queries fail; the watcher must never remain paused.
    app.state::<DesktopState>().dragging.store(false, Ordering::Relaxed);
    windows::fit(&app, None, false)?;
    let enabled = app.state::<Runtime>().settings.lock().map_err(|_| "设置锁失败")?.edge_snap_enabled;
    if enabled {
        let pet = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
        if let Some(monitor) = pet.current_monitor().map_err(|e| e.to_string())? {
            let area = monitor.work_area();
            let position = pet.outer_position().map_err(|e| e.to_string())?;
            let size = pet.outer_size().map_err(|e| e.to_string())?;
            let threshold = (24.0 * monitor.scale_factor()).round() as i32;
            let inset = (12.0 * monitor.scale_factor()).round() as i32;
            pet.set_position(PhysicalPosition::new(
                snap_axis(position.x, area.position.x, area.size.width, size.width, threshold, inset),
                snap_axis(position.y, area.position.y, area.size.height, size.height, threshold, inset),
            )).map_err(|e| e.to_string())?;
        }
    }
    windows::save_now(&app)
}

#[derive(Serialize)]
pub struct PositionSlot { slot: u8, saved: bool }
fn valid_slot(slot: u8) -> Result<(), String> {
    if (1..=3).contains(&slot) { Ok(()) } else { Err("位置编号须为1到3".into()) }
}
#[tauri::command]
pub fn list_pet_positions(app: tauri::AppHandle) -> Result<Vec<PositionSlot>, String> {
    let db = app.state::<Database>();
    let conn = db.0.lock().map_err(|_| "存储锁失败")?;
    (1..=3).map(|slot| {
        let saved = conn.query_row("SELECT EXISTS(SELECT 1 FROM window_positions WHERE slot=?1)", [slot], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        Ok(PositionSlot {slot, saved})
    }).collect()
}
#[tauri::command]
pub fn save_pet_position(app: tauri::AppHandle, slot: u8) -> Result<(), String> {
    valid_slot(slot)?;
    let geometry = windows::current_geometry(&app)?;
    let db = app.state::<Database>();
    let conn = db.0.lock().map_err(|_| "存储锁失败")?;
    conn.execute("INSERT INTO window_positions VALUES(?1,?2) ON CONFLICT(slot) DO UPDATE SET json=excluded.json",
        rusqlite::params![slot, serde_json::to_string(&geometry).map_err(|e| e.to_string())?])
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn restore_pet_position(app: tauri::AppHandle, slot: u8) -> Result<(), String> {
    valid_slot(slot)?;
    let raw: String = {
        let db = app.state::<Database>();
        let conn = db.0.lock().map_err(|_| "存储锁失败")?;
        conn.query_row("SELECT json FROM window_positions WHERE slot=?1", [slot], |r| r.get(0))
            .map_err(|_| "这个位置尚未保存")?
    };
    let mut saved: windows::Geometry = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    let current = windows::current_geometry(&app)?;
    // A position preset never changes the user's continuous size setting.
    saved.width = current.width;
    saved.height = current.height;
    windows::fit(&app, Some(saved), false)?;
    manual_visible(&app, true)?;
    windows::save_now(&app)
}

#[cfg(windows)]
fn external_fullscreen(app: &tauri::AppHandle) -> bool {
    use windows_sys::Win32::{Foundation::RECT, UI::WindowsAndMessaging::*};
    let Some(pet) = app.get_webview_window("pet") else { return false; };
    let Ok(Some(monitor)) = pet.current_monitor() else { return false; };
    unsafe {
        let window = GetForegroundWindow();
        if window.is_null() || IsIconic(window) != 0 || IsWindowVisible(window) == 0 { return false; }
        let mut pid = 0;
        GetWindowThreadProcessId(window, &mut pid);
        if pid == std::process::id() { return false; }
        let mut name = [0u16; 128];
        let length = GetClassNameW(window, name.as_mut_ptr(), name.len() as i32);
        if ["Progman", "WorkerW", "Shell_TrayWnd"].contains(&String::from_utf16_lossy(&name[..length.max(0) as usize]).as_str()) { return false; }
        // Ordinary maximized document windows retain a caption/frame and must stay visible.
        let style = GetWindowLongPtrW(window, GWL_STYLE) as u32;
        if style & WS_CAPTION != 0 || style & WS_THICKFRAME != 0 { return false; }
        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(window, &mut rect) == 0 { return false; }
        let pos = monitor.position(); let size = monitor.size();
        rect.left <= pos.x + 2 && rect.top <= pos.y + 2
            && rect.right >= pos.x + size.width as i32 - 2
            && rect.bottom >= pos.y + size.height as i32 - 2
    }
}
#[cfg(not(windows))]
fn external_fullscreen(_: &tauri::AppHandle) -> bool { false }

fn desired_hidden(state: &Visibility, enabled: bool, fullscreen: bool, dragging: bool) -> bool {
    state.manual_hidden || (enabled && fullscreen && !state.override_fullscreen && !dragging)
}
pub fn watch(app: tauri::AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_millis(500));
        let enabled = app.state::<Runtime>().settings.lock().map(|s| s.fullscreen_hide_enabled).unwrap_or(false);
        let fullscreen = external_fullscreen(&app);
        let desktop = app.state::<DesktopState>();
        let Ok(mut state) = desktop.visibility.lock() else { continue; };
        if !fullscreen { state.override_fullscreen = false; }
        let dragging = desktop.dragging.load(Ordering::Relaxed);
        if state.manual_hidden || dragging { continue; }
        let Some(pet) = app.get_webview_window("pet") else { continue; };
        let hide = desired_hidden(&state, enabled, fullscreen, dragging);
        if hide && !state.auto_hidden {
            if pet.hide().is_ok() { state.auto_hidden = true; }
        } else if !hide && state.auto_hidden && pet.show().is_ok() {
            state.auto_hidden = false;
        }
    });
}

#[tauri::command]
fn exit_fullscreen_fixture(app: tauri::AppHandle) { app.exit(0); }

// Explicit QA filename only. This isolated process starts no input hook,
// tray, settings repository, or autostart. Read position solely to select
// the same monitor as the running pet; never change user data from a fixture.
pub fn run_fullscreen_fixture() {
    let mut context = tauri::generate_context!();
    context.config_mut().app.windows.clear();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![exit_fullscreen_fixture])
        .setup(|app| {
            let fixture = tauri::WebviewWindowBuilder::new(app, "panel-fullscreen-test",
                tauri::WebviewUrl::App("assets/desktop-fullscreen-test.html".into()))
                .title("长离桌宠 · 本地全屏验收").inner_size(800.0, 600.0).build()?;
            if let Ok(conn) = rusqlite::Connection::open_with_flags(
                app.path().app_data_dir()?.join("companion.sqlite3"), rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY) {
                if let Ok(raw) = conn.query_row::<String, _, _>("SELECT json FROM window_geometry WHERE id=1", [], |r| r.get(0)) {
                    if let Ok(g) = serde_json::from_str::<windows::Geometry>(&raw) {
                        if let Some(m) = fixture.available_monitors()?.iter().find(|m| {
                            let p = m.position(); let s = m.size();
                            g.x >= p.x && g.y >= p.y && g.x < p.x + s.width as i32 && g.y < p.y + s.height as i32
                        }) { fixture.set_position(PhysicalPosition::new(m.position().x + 50, m.position().y + 50))?; }
                    }
                }
            }
            fixture.set_fullscreen(true)?;
            fixture.set_focus()?;
            Ok(())
        })
        .run(context).expect("fullscreen QA fixture failed");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn snap_near_edges_preserves_interior_and_negative_monitor() {
        assert_eq!(snap_axis(-1910, -1920, 1920, 360, 24, 12), -1908);
        assert_eq!(snap_axis(-1000, -1920, 1920, 360, 24, 12), -1000);
        assert_eq!(snap_axis(1540, 0, 1920, 360, 24, 12), 1548);
        assert_eq!(snap_axis(50, 0, 100, 360, 24, 12), 0);
    }
    #[test]
    fn fullscreen_recovery_and_manual_hide_are_independent() {
        let mut state = Visibility::default();
        assert!(desired_hidden(&state, true, true, false));
        assert!(!desired_hidden(&state, true, false, false));
        state.override_fullscreen = true;
        assert!(!desired_hidden(&state, true, true, false));
        state.manual_hidden = true;
        assert!(desired_hidden(&state, false, false, false));
        state.manual_hidden = false;
        state.override_fullscreen = false;
        assert!(!desired_hidden(&state, true, true, true));
    }
}
