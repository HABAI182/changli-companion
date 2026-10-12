use tauri::{Emitter, LogicalSize, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

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
        let weak = w.clone();
        w.on_window_event(move |e| {
            if matches!(e, tauri::WindowEvent::Focused(false)) {
                let _ = weak.hide();
            }
        });
        w
    };
    menu.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    crate::input::register_editor(&menu);
    menu.set_size(LogicalSize::new(260.0, height as f64 / f))
        .map_err(|e| e.to_string())?;
    menu.show().map_err(|e| e.to_string())?;
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
    Ok(())
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
