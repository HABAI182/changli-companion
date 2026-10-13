use tauri::{Emitter, LogicalSize, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};
use std::sync::atomic::{AtomicBool, Ordering};
static MENU_OPEN: AtomicBool = AtomicBool::new(false);
pub fn is_open() -> bool { MENU_OPEN.load(Ordering::Relaxed) }
fn inside(point: (i32, i32), origin: (i32, i32), size: (u32, u32)) -> bool {
    point.0 >= origin.0 && point.1 >= origin.1 &&
    point.0 < origin.0.saturating_add_unsigned(size.0) && point.1 < origin.1.saturating_add_unsigned(size.1)
}
pub fn dismiss_if_outside(app: &tauri::AppHandle, x: i32, y: i32, right_click: bool) {
    if !is_open() { return; }
    let Some(menu) = app.get_webview_window("pet-menu") else { return; };
    // Right-clicking the pet is an intentional reopen/reposition gesture.
    if right_click {
        if let Some(pet) = app.get_webview_window("pet") {
            if let (Ok(p), Ok(s)) = (pet.outer_position(), pet.outer_size()) {
                if inside((x, y), (p.x, p.y), (s.width, s.height)) { return; }
            }
        }
    }
    if let (Ok(p), Ok(s)) = (menu.outer_position(), menu.outer_size()) {
        if !inside((x, y), (p.x, p.y), (s.width, s.height)) { let _ = close_pet_menu(app.clone()); }
    }
}

#[tauri::command]
pub async fn open_pet_menu(app: tauri::AppHandle) -> Result<(), String> {
    let pet = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
    let p = pet.outer_position().map_err(|e| e.to_string())?;
    let size = pet.outer_size().map_err(|e| e.to_string())?;
    let monitor = pet
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("显示器不存在")?;
    let area = monitor.work_area();
    let f = monitor.scale_factor();
    let width = (260.0 * f).round() as i32;
    let height = ((468.0 * f).round() as i32).min(area.size.height as i32 - 16);
    let left = area.position.x;
    let top = area.position.y;
    let right = left + area.size.width as i32;
    let bottom = top + area.size.height as i32;
    let gap = (12.0 * f).round() as i32;
    let (mut x, mut y) = (p.x + size.width as i32 + gap, p.y);
    if x + width > right - 8 {
        if p.x - gap - width >= left + 8 {
            x = p.x - gap - width;
        } else if p.y - gap - height >= top + 8 {
            x = p.x;
            y = p.y - gap - height;
        } else {
            x = p.x;
            y = p.y + size.height as i32 + gap;
        }
    }
    x = x.clamp(left + 8, (right - width - 8).max(left + 8));
    y = y.clamp(top + 8, (bottom - height - 8).max(top + 8));
    let menu = if let Some(w) = app.get_webview_window("pet-menu") {
        w
    } else {
        let w = WebviewWindowBuilder::new(
            &app,
            "pet-menu",
            WebviewUrl::App("index.html?menu=1".into()),
        )
        .title("长离 · 互动")
        .inner_size(260.0, 468.0)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .resizable(false)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;
        // A draggable floating palette must survive native move/activation
        // transitions. Close explicitly through actions, Escape or the X.
        w
    };
    menu.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    crate::input::register_editor(&menu);
    menu.set_size(LogicalSize::new(260.0, height as f64 / f))
        .map_err(|e| e.to_string())?;
    menu.show().map_err(|e| e.to_string())?;
    MENU_OPEN.store(true, Ordering::Relaxed);
    menu.set_focus().map_err(|e| e.to_string())
}
#[tauri::command]
pub fn drag_pet_menu(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("pet-menu").ok_or("互动窗口不存在")?
        .start_dragging().map_err(|e|e.to_string())
}
#[tauri::command]
pub fn close_pet_menu(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("pet-menu") {
        w.hide().map_err(|e| e.to_string())?;
    }
    MENU_OPEN.store(false, Ordering::Relaxed);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::inside;
    #[test]
    fn outside_click_uses_physical_bounds_even_on_negative_monitor_coordinates() {
        assert!(inside((-200, 10), (-300, -50), (260, 468)));
        assert!(!inside((-301, 10), (-300, -50), (260, 468)));
        assert!(!inside((-40, 10), (-300, -50), (260, 468)));
        assert!(!inside((-200, 418), (-300, -50), (260, 468)));
    }
}
#[tauri::command]
pub fn menu_action(app: tauri::AppHandle, kind: String, id: String) -> Result<(), String> {
    let data: serde_json::Value =
        serde_json::from_str(include_str!("../../public/models/changli/model.json"))
            .map_err(|e| e.to_string())?;
    let field = match kind.as_str() {
        "expression" => "expressions",
        "animation" => "animations",
        _ => return Err("未知动作".into()),
    };
    if !data[field]
        .as_array()
        .is_some_and(|items| items.iter().any(|x| x["id"].as_str() == Some(&id)))
    {
        return Err("动作不存在".into());
    }
    app.emit_to(
        "pet",
        "shortcut-command",
        serde_json::json!({"action":{"type":kind,"id":id},"trigger":"toggle","pressed":true}),
    )
    .map_err(|e| e.to_string())?;
    close_pet_menu(app)
}
