//! Native-only semantic conversion. Show physical key labels transiently;
//! never translate keys to text, log keycodes, intercept, or inject input.
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::{Emitter, Manager};
pub static ACTIVE: AtomicBool = AtomicBool::new(false);
pub static RAW_ACTIVE: AtomicBool = AtomicBool::new(false);
static SETTINGS_EDITOR: std::sync::atomic::AtomicIsize = std::sync::atomic::AtomicIsize::new(0);
static MENU_EDITOR: std::sync::atomic::AtomicIsize = std::sync::atomic::AtomicIsize::new(0);
pub fn register_editor(window: &tauri::WebviewWindow) {
    #[cfg(windows)]
    if let Ok(handle) = window.hwnd() {
        let target = if window.label() == "pet-menu" {
            &MENU_EDITOR
        } else {
            &SETTINGS_EDITOR
        };
        target.store(handle.0 as isize, Ordering::Relaxed);
    }
}
fn editor_handle(foreground: isize, settings: isize, menu: isize) -> bool {
    foreground != 0 && (foreground == settings || foreground == menu)
}
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
        UI::{Input::*, WindowsAndMessaging::*},
    };
    static SEND: OnceLock<SyncSender<Input>> = OnceLock::new();
    thread_local! {static MOVE_TIME:Cell<Option<Instant>>=const{Cell::new(None)};}
    thread_local! {static RAW_CURSOR:Cell<Option<((i32,i32),Instant,(f64,f64))>>=const{Cell::new(None)};}
    unsafe fn own_editor() -> bool {
        let foreground = GetForegroundWindow();
        let mut pid = 0;
        GetWindowThreadProcessId(foreground, &mut pid);
        pid == GetCurrentProcessId()
            && editor_handle(
                foreground as isize,
                SETTINGS_EDITOR.load(Ordering::Relaxed),
                MENU_EDITOR.load(Ordering::Relaxed),
            )
    }
    fn send(signal: &'static str, x: f64, y: f64, key: Option<KeyDisplay>) {
        if let Some(tx) = SEND.get() {
            let _ = tx.try_send(Input { signal, x, y, key });
        }
    }
    fn send_key(vk: u32) {
        let signal = match vk {
            0x0d => "enter", 0x08 => "backspace", 0x20 => "space",
            vk => crate::model::key_region(vk),
        };
        send(signal, 0.0, crate::model::key_depth(vk), key_label(vk).map(|label| KeyDisplay { label, phase: "down" }));
    }
    fn raw_key_down(event: &RAWKEYBOARD) -> bool {
        event.VKey != 255 && event.Flags as u32 & RI_KEY_BREAK == 0
            && (event.Message == WM_KEYDOWN || event.Message == WM_SYSKEYDOWN)
    }
    unsafe extern "system" fn raw_window(window: HWND, message: u32, w: WPARAM, l: LPARAM) -> LRESULT {
        if message == WM_INPUT {
            let mut event = RAWINPUT::default();
            let mut size = std::mem::size_of::<RAWINPUT>() as u32;
            let read = GetRawInputData(l as HRAWINPUT, RID_INPUT,
                &mut event as *mut _ as *mut _, &mut size, std::mem::size_of::<RAWINPUTHEADER>() as u32);
            if read != u32::MAX && read >= std::mem::size_of::<RAWINPUTHEADER>() as u32 {
                match event.header.dwType {
                    RIM_TYPEKEYBOARD => {
                        let key = event.data.keyboard;
                        if !own_editor() && raw_key_down(&key) { send_key(key.VKey as u32); }
                    }
                    RIM_TYPEMOUSE => {
                        let mouse = event.data.mouse;
                        let buttons = mouse.Anonymous.Anonymous;
                        if crate::pet_menu::is_open() && buttons.usButtonFlags as u32 & (RI_MOUSE_LEFT_BUTTON_DOWN | RI_MOUSE_RIGHT_BUTTON_DOWN | RI_MOUSE_MIDDLE_BUTTON_DOWN) != 0 {
                            let mut point = POINT::default();
                            if GetCursorPos(&mut point) != 0 {
                                send(if buttons.usButtonFlags as u32 & RI_MOUSE_RIGHT_BUTTON_DOWN != 0 { "__menu_outside_right" } else { "__menu_outside_click" },point.x as f64,point.y as f64,None);
                            }
                        }
                        if own_editor() { return DefWindowProcW(window,message,w,l); }
                        if buttons.usButtonFlags as u32 & RI_MOUSE_LEFT_BUTTON_DOWN != 0 { send("left",0.0,0.0,None); }
                        if buttons.usButtonFlags as u32 & RI_MOUSE_RIGHT_BUTTON_DOWN != 0 { send("right",0.0,0.0,None); }
                        if buttons.usButtonFlags as u32 & (RI_MOUSE_WHEEL | RI_MOUSE_HWHEEL) != 0 {
                            send("wheel",0.0,-(buttons.usButtonData as i16).signum() as f64,None);
                        }
                        if mouse.lLastX != 0 || mouse.lLastY != 0 {
                            let now=Instant::now();
                            MOVE_TIME.with(|time| {
                                if time.get().is_some_and(|last| now.duration_since(last)<Duration::from_millis(33)) { return; }
                                time.set(Some(now));
                                let mut point=POINT::default();
                                if GetCursorPos(&mut point)==0 { return; }
                                RAW_CURSOR.with(|state| {
                                    let current=(point.x,point.y);
                                    let (last,since,mut offset)=state.get().unwrap_or((current,now,(0.0,0.0)));
                                    if current==last && mouse.usFlags & MOUSE_MOVE_ABSOLUTE == 0 && now.duration_since(since)>=Duration::from_millis(100) {
                                        // Games can lock the cursor while physical mouse deltas continue.
                                        offset=((offset.0+mouse.lLastX as f64/240.0).clamp(-1.0,1.0),(offset.1+mouse.lLastY as f64/240.0).clamp(-1.0,1.0));
                                        state.set(Some((current,since,offset)));
                                        send("__relative_move",offset.0,offset.1,None);
                                    } else {
                                        state.set(Some((current,if current==last {since} else {now},(0.0,0.0))));
                                        send("move",point.x as f64,point.y as f64,None);
                                    }
                                });
                            });
                        }
                    }
                    _ => {}
                }
            }
        }
        // Never consume or inject input into the foreground game.
        DefWindowProcW(window,message,w,l)
    }
    unsafe fn register_raw_sink(module: HINSTANCE) -> HWND {
        let name:Vec<u16>="ChangliBackgroundInput\0".encode_utf16().collect();
        let class=WNDCLASSW { lpfnWndProc:Some(raw_window),hInstance:module,lpszClassName:name.as_ptr(),..Default::default() };
        if RegisterClassW(&class)==0 { return null_mut(); }
        let window=CreateWindowExW(0,name.as_ptr(),name.as_ptr(),0,0,0,0,0,HWND_MESSAGE,null_mut(),module,null_mut());
        if window.is_null() { return window; }
        // INPUTSINK observes only. Do not use NOLEGACY/CAPTUREMOUSE/NOHOTKEYS.
        let devices=[
            RAWINPUTDEVICE{usUsagePage:1,usUsage:6,dwFlags:RIDEV_INPUTSINK,hwndTarget:window},
            RAWINPUTDEVICE{usUsagePage:1,usUsage:2,dwFlags:RIDEV_INPUTSINK,hwndTarget:window},
        ];
        if RegisterRawInputDevices(devices.as_ptr(),devices.len() as u32,std::mem::size_of::<RAWINPUTDEVICE>() as u32)==0 {
            DestroyWindow(window); return null_mut();
        }
        window
    }
    unsafe extern "system" fn keyboard(code: i32, w: WPARAM, l: LPARAM) -> LRESULT {
        if !RAW_ACTIVE.load(Ordering::Relaxed) && code >= 0 && (w as u32 == WM_KEYDOWN || w as u32 == WM_SYSKEYDOWN) && !own_editor() {
            let event = &*(l as *const KBDLLHOOKSTRUCT);
            send_key(event.vkCode);
        }
        CallNextHookEx(null_mut(), code, w, l)
    }
    unsafe extern "system" fn mouse(code: i32, w: WPARAM, l: LPARAM) -> LRESULT {
        // Fresh clicks outside dismiss the palette; drag moves and releases
        // do not. Queue before own_editor: foreground can still be the menu.
        if code >= 0 && [WM_LBUTTONDOWN, WM_RBUTTONDOWN, WM_MBUTTONDOWN].contains(&(w as u32)) && crate::pet_menu::is_open() {
            let event = &*(l as *const MSLLHOOKSTRUCT);
            send(if w as u32 == WM_RBUTTONDOWN { "__menu_outside_right" } else { "__menu_outside_click" }, event.pt.x as f64, event.pt.y as f64, None);
        }
        if !RAW_ACTIVE.load(Ordering::Relaxed) && code >= 0 && !own_editor() {
            match w as u32 {
                WM_LBUTTONDOWN => send("left", 0.0, 0.0, None),
                WM_RBUTTONDOWN => send("right", 0.0, 0.0, None),
                WM_MOUSEWHEEL | WM_MOUSEHWHEEL => {
                    let e = &*(l as *const MSLLHOOKSTRUCT);
                    send(
                        "wheel",
                        0.0,
                        -((e.mouseData >> 16) as i16).signum() as f64,
                        None,
                    );
                }
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
                if signal.signal == "__menu_outside_click" || signal.signal == "__menu_outside_right" {
                    crate::pet_menu::dismiss_if_outside(&app, signal.x as i32, signal.y as i32, signal.signal == "__menu_outside_right");
                    continue;
                }
                if signal.signal == "__relative_move" {
                    signal.signal = "move";
                } else if signal.signal == "move" {
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
            let raw_window = register_raw_sink(module);
            let raw = !raw_window.is_null();
            RAW_ACTIVE.store(raw, Ordering::Relaxed);
            let key = if raw { null_mut() } else { SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard), module, 0) };
            let mouse_hook = if raw { null_mut() } else { SetWindowsHookExW(WH_MOUSE_LL, Some(mouse), module, 0) };
            if !raw && (key.is_null() || mouse_hook.is_null()) {
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
            if !key.is_null() { UnhookWindowsHookEx(key); }
            if !mouse_hook.is_null() { UnhookWindowsHookEx(mouse_hook); }
            if raw { DestroyWindow(raw_window); }
            RAW_ACTIVE.store(false, Ordering::Relaxed);
            ACTIVE.store(false, Ordering::Relaxed);
        });
    }
    #[cfg(test)]
    mod raw_tests {
        use super::*;
        #[test]
        fn raw_keys_ignore_release_and_invalid_device_keys() {
            let key=RAWKEYBOARD{VKey:0x51,Message:WM_KEYDOWN,..Default::default()};
            assert!(raw_key_down(&key));
            assert!(!raw_key_down(&RAWKEYBOARD{Flags:RI_KEY_BREAK as u16,..key}));
            assert!(!raw_key_down(&RAWKEYBOARD{Message:WM_KEYUP,..key}));
            assert!(!raw_key_down(&RAWKEYBOARD{VKey:255,..key}));
        }
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
    fn own_pet_foreground_does_not_block_startup_input() {
        assert!(!editor_handle(100, 0, 0));
        assert!(!editor_handle(100, 200, 300));
        assert!(editor_handle(200, 200, 300));
        assert!(editor_handle(300, 200, 300));
        assert!(!editor_handle(0, 0, 0));
    }
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
