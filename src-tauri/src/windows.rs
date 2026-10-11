use crate::storage::Database;
use serde::{Deserialize, Serialize};
use tauri::{LogicalSize, Manager, PhysicalPosition};
#[derive(Serialize, Deserialize, Clone, PartialEq)]
pub struct Geometry {
    pub x: i32,
    pub y: i32,
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub monitor: Option<String>,
}

pub fn clamp_axis(value: i32, start: i32, length: u32, size: u32) -> i32 {
    value.clamp(start, start + (length.saturating_sub(size)) as i32)
}
// Only the transparent lower 13% may extend below the work area. The visible
// keyboard and the relocated drag handle remain above it at every pet scale.
pub fn visible_height(height: u32) -> u32 { height - (height as f64 * 0.13).floor() as u32 }
pub fn fit(
    app: &tauri::AppHandle,
    saved: Option<Geometry>,
    bottom_right: bool,
) -> Result<(), String> {
    let w = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
    let monitors = w.available_monitors().map_err(|e| e.to_string())?;
    let pos = if let Some(g) = &saved {
        PhysicalPosition::new(g.x, g.y)
    } else {
        w.outer_position().map_err(|e| e.to_string())?
    };
    let monitor = if bottom_right {
        w.primary_monitor().map_err(|e| e.to_string())?
    } else {
        monitors
            .iter()
            .find(|m| {
                let a = m.work_area();
                pos.x >= a.position.x
                    && pos.y >= a.position.y
                    && pos.x < a.position.x + a.size.width as i32
                    && pos.y < a.position.y + a.size.height as i32
            })
            .cloned()
            .or(w.primary_monitor().map_err(|e| e.to_string())?)
    }
    .ok_or("未找到显示器")?;
    let area = monitor.work_area();
    let factor = monitor.scale_factor();
    if let Some(g) = &saved {
        w.set_size(LogicalSize::new(
            g.width
                .clamp(180.0, 720.0)
                .min(area.size.width as f64 / factor),
            g.height
                .clamp(160.0, 640.0)
                .min(area.size.height as f64 / factor),
        ))
        .map_err(|e| e.to_string())?;
    }
    let size = w.outer_size().map_err(|e| e.to_string())?;
    let mut x = pos.x;
    let mut y = pos.y;
    if bottom_right {
        x = area.position.x + area.size.width as i32 - size.width as i32 - 16;
        y = area.position.y + area.size.height as i32 - visible_height(size.height) as i32 - (6.0 * factor).round() as i32;
    }
    let target = PhysicalPosition::new(
        clamp_axis(x, area.position.x, area.size.width, size.width),
        clamp_axis(y, area.position.y, area.size.height, visible_height(size.height)),
    );
    if target != w.outer_position().map_err(|e| e.to_string())? {
        w.set_position(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}
pub fn restore(app: &tauri::AppHandle) -> Result<(), String> {
    let db = app.state::<Database>();
    let raw: Option<String> =
        db.0.lock()
            .map_err(|_| "存储锁失败")?
            .query_row("SELECT json FROM window_geometry WHERE id=1", [], |r| {
                r.get(0)
            })
            .ok();
    let saved = raw.and_then(|r| serde_json::from_str::<Geometry>(&r).ok());
    let initial = saved.is_none();
    fit(app, saved, initial)
}
pub fn watch(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut previous: Option<Geometry> = None;
        loop {
            std::thread::sleep(std::time::Duration::from_secs(2));
            if app.state::<crate::desktop::DesktopState>().dragging.load(std::sync::atomic::Ordering::Relaxed) { continue; }
            // Re-evaluate monitor work areas periodically, including monitor removal while running.
            let _ = fit(&app, None, false);
            if let Some(w) = app.get_webview_window("pet") {
                if let (Ok(p), Ok(s), Ok(f)) =
                    (w.outer_position(), w.inner_size(), w.scale_factor())
                {
                    let g = Geometry {
                        x: p.x,
                        y: p.y,
                        width: s.width as f64 / f,
                        height: s.height as f64 / f,
                        monitor: w
                            .current_monitor()
                            .ok()
                            .flatten()
                            .and_then(|m| m.name().cloned()),
                    };
                    if previous.as_ref() != Some(&g) {
                        if let Ok(json) = serde_json::to_string(&g) {
                            let db = app.state::<Database>();
                            if let Ok(conn) = db.0.lock() {
                                if conn.execute("INSERT INTO window_geometry VALUES(1,?1) ON CONFLICT(id) DO UPDATE SET json=excluded.json",[json]).is_ok(){previous=Some(g);}
                            };
                        }
                    }
                }
            }
        }
    });
}
pub fn current_geometry(app: &tauri::AppHandle) -> Result<Geometry, String> {
    let w = app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;
    let p = w.outer_position().map_err(|e| e.to_string())?;
    let s = w.inner_size().map_err(|e| e.to_string())?;
    let f = w.scale_factor().map_err(|e| e.to_string())?;
    let g = Geometry {
        x: p.x,
        y: p.y,
        width: s.width as f64 / f,
        height: s.height as f64 / f,
        monitor: w
            .current_monitor()
            .ok()
            .flatten()
            .and_then(|m| m.name().cloned()),
    };
    Ok(g)
}
pub fn save_now(app: &tauri::AppHandle) -> Result<(), String> {
    let g = current_geometry(app)?;
    let json = serde_json::to_string(&g).map_err(|e| e.to_string())?;
    let db = app.state::<Database>();
    let conn = db.0.lock().map_err(|_| "存储锁失败")?;
    conn.execute(
        "INSERT INTO window_geometry VALUES(1,?1) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
        [json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn negative_monitor_and_oversized() {
        assert_eq!(clamp_axis(-2200, -1920, 1920, 360), -1920);
        assert_eq!(clamp_axis(5000, 0, 1920, 540), 1380);
        assert_eq!(clamp_axis(40, 0, 100, 360), 0);
    }
    #[test]
    fn bottom_transparent_padding_does_not_hold_keyboard_above_edge() {
        assert_eq!(visible_height(480), 418);
        assert_eq!(clamp_axis(2000, 0, 1530, visible_height(480)), 1112);
        assert_eq!(visible_height(240), 209);
        assert_eq!(visible_height(960), 836);
    }
}
