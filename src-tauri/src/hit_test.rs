//! Mouse pass-through follows the rendered silhouette, not the window rectangle.
use std::sync::Mutex;
use tauri::Manager;

#[derive(Clone)]
struct Mask {
    width: usize,
    height: usize,
    cells: Vec<u8>,
}
impl Mask {
    fn contains(&self, x: f64, y: f64) -> bool {
        if !(0.0..1.0).contains(&x) || !(0.0..1.0).contains(&y) {
            return false;
        }
        let i = (y * self.height as f64) as usize * self.width + (x * self.width as f64) as usize;
        self.cells[i / 8] & (1 << (i % 8)) != 0
    }
}
#[derive(Default)]
pub struct HitTestState {
    mask: Mutex<Option<Mask>>,
}

#[tauri::command]
pub fn set_pet_hit_mask(
    window: tauri::WebviewWindow,
    state: tauri::State<HitTestState>,
    width: usize,
    height: usize,
    bits: String,
) -> Result<(), String> {
    if window.label() != "pet"
        || width == 0
        || height == 0
        || width > 360
        || height > 320
        || bits.len() != (width * height).div_ceil(8) * 2
    {
        return Err("桌宠点击区域无效".into());
    }
    let cells = (0..bits.len())
        .step_by(2)
        .map(|i| {
            bits.get(i..i + 2)
                .and_then(|s| u8::from_str_radix(s, 16).ok())
                .ok_or_else(|| "桌宠点击数据无效".to_string())
        })
        .collect::<Result<Vec<_>, _>>()?;
    *state.mask.lock().map_err(|_| "点击区域锁失败")? = Some(Mask {
        width,
        height,
        cells,
    });
    Ok(())
}
pub fn watch(app: tauri::AppHandle) {
    #[cfg(windows)]
    std::thread::spawn(move || {
        use std::sync::atomic::Ordering;
        use windows_sys::Win32::{
            Foundation::{POINT, RECT},
            UI::{
                Input::KeyboardAndMouse::GetAsyncKeyState,
                WindowsAndMessaging::{
                    GetCursorPos, GetWindowLongPtrW, GetWindowRect, GWL_EXSTYLE, WS_EX_TRANSPARENT,
                },
            },
        };
        let Some(pet) = app.get_webview_window("pet") else {
            return;
        };
        let Ok(handle) = pet.hwnd() else {
            return;
        };
        let mut captured = false;
        let mut previous_buttons = false;
        loop {
            std::thread::sleep(std::time::Duration::from_millis(16));
            let mut point = POINT::default();
            let mut rect = RECT::default();
            unsafe {
                if GetCursorPos(&mut point) == 0 || GetWindowRect(handle.0, &mut rect) == 0 {
                    continue;
                }
            }
            let width = (rect.right - rect.left).max(1) as f64;
            let height = (rect.bottom - rect.top).max(1) as f64;
            let x = (point.x - rect.left) as f64 / width;
            let y = (point.y - rect.top) as f64 / height;
            let hit = app
                .state::<HitTestState>()
                .mask
                .lock()
                .ok()
                .and_then(|m| m.as_ref().map(|m| m.contains(x, y)))
                .unwrap_or(true);
            let buttons = unsafe { [1, 2, 4].iter().any(|k| GetAsyncKeyState(*k) < 0) };
            if !buttons {
                captured = false;
            }
            if buttons && !previous_buttons && hit {
                captured = true;
            }
            previous_buttons = buttons;
            let manual = app
                .state::<crate::Runtime>()
                .settings
                .lock()
                .map(|s| s.passthrough)
                .unwrap_or(false);
            let dragging = app
                .state::<crate::desktop::DesktopState>()
                .dragging
                .load(Ordering::Relaxed);
            let ignore = manual || (!dragging && !captured && !hit);
            let actual = unsafe {
                GetWindowLongPtrW(handle.0, GWL_EXSTYLE) & WS_EX_TRANSPARENT as isize != 0
            };
            if ignore != actual {
                let _ = pet.set_ignore_cursor_events(ignore);
            }
        }
    });
    #[cfg(not(windows))]
    let _ = app;
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn alpha_holes_bottom_margin_and_visible_cells_are_distinct() {
        let m = Mask {
            width: 4,
            height: 4,
            cells: vec![0b0110_0110, 0],
        };
        assert!(m.contains(0.3, 0.1));
        assert!(m.contains(0.55, 0.3));
        assert!(!m.contains(0.01, 0.1));
        assert!(!m.contains(0.3, 0.8));
        assert!(!m.contains(-0.1, 0.3));
        assert!(!m.contains(1.0, 0.1));
    }
}
