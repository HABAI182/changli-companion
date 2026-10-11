//! Native-only semantic conversion. Show one physical key label transiently;
//! never translate keys to text, log keycodes, intercept, or inject input.
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::{Emitter, Manager};
pub static ACTIVE: AtomicBool = AtomicBool::new(false);
// Aggregate semantic events for local troubleshooting; never key codes or text.
// These counters live only in memory and reset when the process exits.
static LEFT: AtomicU64 = AtomicU64::new(0);
static RIGHT: AtomicU64 = AtomicU64::new(0);
static SPECIAL: AtomicU64 = AtomicU64::new(0);
static MOUSE: AtomicU64 = AtomicU64::new(0);
pub fn summary() -> String {
    format!(
        "本次运行已发送动作：左键区 {}、右键区 {}、特殊键 {}、鼠标 {}（仅内存计数）。",
        LEFT.load(Ordering::Relaxed),
        RIGHT.load(Ordering::Relaxed),
        SPECIAL.load(Ordering::Relaxed),
        MOUSE.load(Ordering::Relaxed)
    )
}
#[derive(Clone, Serialize)]
pub struct Input {
    signal: &'static str,
    x: f64,
    y: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    key: Option<KeyDisplay>,
}
#[derive(Clone, Serialize)]
pub struct KeyDisplay {
    label: &'static str,
    phase: &'static str,
}

// Physical coordinates and the pet's physical bounds share the same DPI space.
// Looking at a stationary cursor must not depend on how fast it got there.
fn cursor_gaze(point: (f64, f64), origin: (f64, f64), size: (f64, f64)) -> (f64, f64) {
    let center = (origin.0 + size.0 / 2.0, origin.1 + size.1 / 2.0);
    let radius = (size.0 * 1.4).max(240.0);
    (
        ((point.0 - center.0) / radius).clamp(-1.0, 1.0),
        ((point.1 - center.1) / radius).clamp(-1.0, 1.0),
    )
}

// Physical-key names only. They cannot express typed text or IME output.
pub fn key_label(vk: u32) -> Option<&'static str> {
    const LETTERS: [&str; 26] = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R",
        "S", "T", "U", "V", "W", "X", "Y", "Z",
    ];
    const NUMBERS: [&str; 10] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const FUNCTIONS: [&str; 12] = [
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
    ];
    match vk {
        0x41..=0x5a => Some(LETTERS[(vk - 0x41) as usize]),
        0x30..=0x39 => Some(NUMBERS[(vk - 0x30) as usize]),
        0x70..=0x7b => Some(FUNCTIONS[(vk - 0x70) as usize]),
        0x0d => Some("Enter"),
        0x08 => Some("Backspace"),
        0x20 => Some("Space"),
        0x09 => Some("Tab"),
        0x1b => Some("Esc"),
        0x10 | 0xa0 | 0xa1 => Some("Shift"),
        0x11 | 0xa2 | 0xa3 => Some("Ctrl"),
        0x12 | 0xa4 | 0xa5 => Some("Alt"),
        0x14 => Some("CapsLock"),
        0x25 => Some("←"),
        0x26 => Some("↑"),
        0x27 => Some("→"),
        0x28 => Some("↓"),
        0x24 => Some("Home"),
        0x23 => Some("End"),
        0x21 => Some("PageUp"),
        0x22 => Some("PageDown"),
        0x2d => Some("Insert"),
        0x2e => Some("Delete"),
        0xba => Some(";"),
        0xbb => Some("="),
        0xbc => Some(","),
        0xbd => Some("-"),
        0xbe => Some("."),
        0xbf => Some("/"),
        0xc0 => Some("`"),
        0xdb => Some("["),
        0xdc => Some("\\"),
        0xdd => Some("]"),
        0xde => Some("'"),
        _ => None,
    }
}

#[cfg(windows)]
mod windows {
    use super::*;
    use std::{
        cell::Cell,
        ptr::null_mut,
        sync::{
            mpsc::{sync_channel, SyncSender},
            OnceLock,
        },
        time::{Duration, Instant},
    };
    use windows_sys::Win32::{
        Foundation::*,
        System::{LibraryLoader::GetModuleHandleW, Threading::GetCurrentProcessId},
        UI::WindowsAndMessaging::*,
    };
    static SEND: OnceLock<SyncSender<Input>> = OnceLock::new();
    thread_local! {static MOVE_TIME:Cell<Option<Instant>>=const{Cell::new(None)};}
    unsafe fn own_editor() -> bool {
        let mut pid = 0;
        GetWindowThreadProcessId(GetForegroundWindow(), &mut pid);
        pid == GetCurrentProcessId()
    }
    fn send(signal: &'static str, x: f64, y: f64, key: Option<KeyDisplay>) {
        if let Some(tx) = SEND.get() {
            let _ = tx.try_send(Input { signal, x, y, key });
        }
    }
    unsafe extern "system" fn keyboard(code: i32, w: WPARAM, l: LPARAM) -> LRESULT {
        if code >= 0 && (w as u32 == WM_KEYDOWN || w as u32 == WM_SYSKEYDOWN) && !own_editor() {
            let event = &*(l as *const KBDLLHOOKSTRUCT);
            let signal = match event.vkCode {
                0x0d => "enter",
                0x08 => "backspace",
                0x20 => "space",
                vk => crate::model::key_region(vk),
            };
            send(
                signal,
                0.0,
                0.0,
                key_label(event.vkCode).map(|label| KeyDisplay {
                    label,
                    phase: "down",
                }),
            );
        }
        CallNextHookEx(null_mut(), code, w, l)
    }
    unsafe extern "system" fn mouse(code: i32, w: WPARAM, l: LPARAM) -> LRESULT {
        if code >= 0 && !own_editor() {
            match w as u32 {
                WM_LBUTTONDOWN => send("left", 0.0, 0.0, None),
                WM_RBUTTONDOWN => send("right", 0.0, 0.0, None),
                WM_MOUSEWHEEL | WM_MOUSEHWHEEL => {
                    let e = &*(l as *const MSLLHOOKSTRUCT);
                    send("wheel", 0.0, -((e.mouseData >> 16) as i16).signum() as f64, None);
                },
                WM_MOUSEMOVE => {
                    let e = &*(l as *const MSLLHOOKSTRUCT);
                    let now = Instant::now();
                    MOVE_TIME.with(|time| {
                        if time.get().map_or(true, |last| {
                            now.duration_since(last) >= Duration::from_millis(33)
                        }) {
                            time.set(Some(now));
                            // Keep the low-level hook short; query pet bounds
                            // and normalize on the existing delivery worker.
                            send("move", e.pt.x as f64, e.pt.y as f64, None);
                        }
                    });
                }
                _ => {}
            }
        }
        CallNextHookEx(null_mut(), code, w, l)
    }
    pub fn start(app: tauri::AppHandle) {
        let (tx, rx) = sync_channel::<Input>(64);
        let _ = SEND.set(tx);
        std::thread::spawn(move || {
            for mut signal in rx {
                if signal.signal == "move" {
                    let Some(pet) = app.get_webview_window("pet") else {
                        continue;
                    };
                    let (Ok(position), Ok(size)) = (pet.outer_position(), pet.outer_size()) else {
                        continue;
                    };
                    (signal.x, signal.y) = cursor_gaze(
                        (signal.x, signal.y),
                        (position.x as f64, position.y as f64),
                        (size.width as f64, size.height as f64),
                    );
                }
                let counter = match signal.signal {
                    "keyboard_left" => &LEFT,
                    "keyboard_right" => &RIGHT,
                    "enter" | "backspace" | "space" => &SPECIAL,
                    _ => &MOUSE,
                };
                if app.emit_to("pet", "semantic-input", signal).is_ok() {
                    counter.fetch_add(1, Ordering::Relaxed);
                }
            }
        });
        std::thread::spawn(move || unsafe {
            let module = GetModuleHandleW(std::ptr::null());
            let key = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard), module, 0);
            let mouse_hook = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse), module, 0);
            if key.is_null() || mouse_hook.is_null() {
                if !key.is_null() {
                    UnhookWindowsHookEx(key);
                }
                if !mouse_hook.is_null() {
                    UnhookWindowsHookEx(mouse_hook);
                }
                return;
            }
            ACTIVE.store(true, Ordering::Relaxed);
            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            UnhookWindowsHookEx(key);
            UnhookWindowsHookEx(mouse_hook);
            ACTIVE.store(false, Ordering::Relaxed);
        });
    }
}
pub fn start(app: tauri::AppHandle) {
    #[cfg(windows)]
    windows::start(app);
    #[cfg(not(windows))]
    let _ = app;
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn gaze_uses_position_not_mouse_speed_and_supports_negative_monitors() {
        let origin = (-1600.0, 300.0);
        let size = (360.0, 320.0);
        let center = (-1420.0, 460.0);
        assert_eq!(cursor_gaze(center, origin, size), (0.0, 0.0));
        let left = cursor_gaze((-1672.0, 460.0), origin, size);
        let right = cursor_gaze((-1168.0, 460.0), origin, size);
        assert!((left.0 + 0.5).abs() < 1e-12 && left.1 == 0.0);
        assert!((right.0 - 0.5).abs() < 1e-12 && right.1 == 0.0);
        let up = cursor_gaze((-1168.0, 208.0), origin, size);
        assert!((up.0 - 0.5).abs() < 1e-12 && (up.1 + 0.5).abs() < 1e-12);
        assert_eq!(cursor_gaze((8000.0, -8000.0), origin, size), (1.0, -1.0));
        // Scaling both desktop coordinates and the window cannot change gaze.
        assert_eq!(
            cursor_gaze((-2336.0, 920.0), (-3200.0, 600.0), (720.0, 640.0)),
            right
        );
    }
    #[test]
    fn physical_keys_have_bounded_labels() {
        assert_eq!(key_label(0x5a), Some("Z"));
        assert_eq!(key_label(0x70), Some("F1"));
        assert_eq!(key_label(0x7b), Some("F12"));
        assert_eq!(key_label(0x0d), Some("Enter"));
        assert_eq!(key_label(0x08), Some("Backspace"));
        assert_eq!(key_label(0x20), Some("Space"));
        assert_eq!(key_label(0x26), Some("↑"));
        assert_eq!(key_label(0xffff), None);
    }
    #[test]
    fn semantic_payload_contains_one_key_only() {
        let payload = serde_json::to_value(Input {
            signal: "keyboard_left",
            x: 0.0,
            y: 0.0,
            key: Some(KeyDisplay {
                label: "Z",
                phase: "down",
            }),
        })
        .unwrap();
        assert_eq!(payload["key"]["label"], "Z");
        assert!(payload.get("sequence").is_none());
        assert!(payload.get("text").is_none());
    }
}
