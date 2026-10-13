//! macOS-only passive input adapter. No text extraction, event modification,
//! input injection, disk logs, or additional Cargo dependencies.
use super::*;
use std::{
    collections::BTreeMap,
    ffi::c_void,
    ptr,
    sync::{
        atomic::AtomicU8,
        mpsc::{sync_channel, SyncSender},
    },
    time::{Duration, Instant},
};

type Ref = *mut c_void;
#[repr(C)]
#[derive(Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
}
type Callback = unsafe extern "C" fn(Ref, u32, Ref, Ref) -> Ref;
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGPreflightListenEventAccess() -> bool;
    fn CGEventTapCreate(
        location: u32,
        placement: u32,
        options: u32,
        mask: u64,
        callback: Callback,
        context: Ref,
    ) -> Ref;
    fn CGEventTapEnable(tap: Ref, enable: bool);
    fn CGEventTapIsEnabled(tap: Ref) -> bool;
    fn CGEventGetIntegerValueField(event: Ref, field: u32) -> i64;
    fn CGEventGetFlags(event: Ref) -> u64;
    fn CGEventSourceKeyState(state: i32, key: u16) -> bool;
    fn CGEventCreate(source: Ref) -> Ref;
    fn CGEventGetLocation(event: Ref) -> Point;
}
#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    static kCFRunLoopDefaultMode: Ref;
    fn CFRunLoopGetCurrent() -> Ref;
    fn CFMachPortCreateRunLoopSource(allocator: Ref, port: Ref, order: isize) -> Ref;
    fn CFRunLoopAddSource(runloop: Ref, source: Ref, mode: Ref);
    fn CFRunLoopRemoveSource(runloop: Ref, source: Ref, mode: Ref);
    fn CFRunLoopRunInMode(mode: Ref, seconds: f64, return_after_source: bool) -> i32;
    fn CFMachPortInvalidate(port: Ref);
    fn CFRelease(value: *const c_void);
}
static RESET: AtomicU64 = AtomicU64::new(0);
// 0: starting; 1: awaiting Input Monitoring; 2: tap unavailable.
static STATUS: AtomicU8 = AtomicU8::new(0);
pub fn status() -> &'static str {
    match STATUS.load(Ordering::Relaxed) {
        1 => "macOS 鼠标视线跟随可用；全局键鼠监听等待授权。请在系统设置 → 隐私与安全性 → 输入监控中添加并允许离火长明，必要时退出并重新打开应用。",
        2 => "macOS 鼠标视线跟随可用；全局监听注册失败，正在重试。请检查输入监控权限；安全输入期间 macOS 可能暂停键盘事件。",
        _ => "macOS 输入监听正在初始化。",
    }
}

pub fn summary() -> String {
    if !ACTIVE.load(Ordering::Relaxed) {
        return status().into();
    }
    let d = input_diagnostics();
    format!(
        "macOS 输入监控已启动；原生接收：键盘 {}、鼠标 {}；画面收到 {}、绘制 {} 帧。仅内存计数。",
        d.raw_keyboard, d.raw_mouse, d.frontend_received, d.rendered_frames
    )
}

// Carbon hardware key codes -> the existing physical-key semantic layout.
// This intentionally ignores the active keyboard layout, Unicode and IME text.
fn virtual_key(code: i64) -> Option<u32> {
    Some(match code {
        0 => 65,
        1 => 83,
        2 => 68,
        3 => 70,
        4 => 72,
        5 => 71,
        6 => 90,
        7 => 88,
        8 => 67,
        9 => 86,
        11 => 66,
        12 => 81,
        13 => 87,
        14 => 69,
        15 => 82,
        16 => 89,
        17 => 84,
        18 => 49,
        19 => 50,
        20 => 51,
        21 => 52,
        22 => 54,
        23 => 53,
        24 => 187,
        25 => 57,
        26 => 55,
        27 => 189,
        28 => 56,
        29 => 48,
        30 => 221,
        31 => 79,
        32 => 85,
        33 => 219,
        34 => 73,
        35 => 80,
        36 | 76 => 13,
        37 => 76,
        38 => 74,
        39 => 222,
        40 => 75,
        41 => 186,
        42 => 220,
        43 => 188,
        44 => 191,
        45 => 78,
        46 => 77,
        47 => 190,
        48 => 9,
        49 => 32,
        50 => 192,
        51 => 8,
        53 => 27,
        54 => 92,
        55 => 91,
        56 => 160,
        57 => 20,
        58 => 164,
        59 => 162,
        60 => 161,
        61 => 165,
        62 => 163,
        63 => 255,
        65 => 110,
        67 => 106,
        69 => 107,
        71 => 12,
        75 => 111,
        78 => 109,
        81 => 187,
        82 => 96,
        83 => 97,
        84 => 98,
        85 => 99,
        86 => 100,
        87 => 101,
        88 => 102,
        89 => 103,
        91 => 104,
        92 => 105,
        96 => 116,
        97 => 117,
        98 => 118,
        99 => 114,
        100 => 119,
        101 => 120,
        103 => 122,
        109 => 121,
        111 => 123,
        114 => 45,
        115 => 36,
        116 => 33,
        117 => 46,
        118 => 115,
        119 => 35,
        120 => 113,
        121 => 34,
        122 => 112,
        123 => 37,
        124 => 39,
        125 => 40,
        126 => 38,
        _ => return None,
    })
}
fn physical_label(vk: u32) -> Option<&'static str> {
    match vk {
        91 | 92 => Some("Cmd"),
        255 => Some("Fn"),
        12 => Some("Clear"),
        96..=105 => Some(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"][(vk - 96) as usize]),
        106 => Some("*"),
        107 => Some("+"),
        109 => Some("-"),
        110 => Some("."),
        111 => Some("/"),
        _ => key_label(vk),
    }
}
fn keyboard_input(code: i64, phase: &'static str, repeat: bool) -> Option<Input> {
    let vk = virtual_key(code)?;
    Some(Input {
        signal: match vk {
            13 => "enter",
            8 => "backspace",
            32 => "space",
            91 | 255 => "keyboard_left",
            92 => "keyboard_right",
            _ => crate::model::key_region(vk),
        },
        x: 0.0,
        y: if matches!(vk, 91 | 92 | 255) {
            1.0
        } else {
            crate::model::key_depth(vk)
        },
        key: physical_label(vk).map(|label| KeyDisplay {
            label,
            phase,
            repeat,
            code: code as u32,
        }),
    })
}
fn modifier_down(code: i64, current: u64, held: bool) -> bool {
    let (mask, device) = match code {
        56 => (1 << 17, 0x2),
        60 => (1 << 17, 0x4),
        59 => (1 << 18, 0x1),
        62 => (1 << 18, 0x2000),
        58 => (1 << 19, 0x20),
        61 => (1 << 19, 0x40),
        55 => (1 << 20, 0x8),
        54 => (1 << 20, 0x10),
        63 => (1 << 23, 0),
        _ => return false,
    };
    current & mask != 0 && (current & device != 0 || !held)
}
struct Event {
    input: Input,
    target_pid: i64,
    point: Option<crate::macos::Point>,
}
struct Tap {
    sender: SyncSender<Event>,
    port: Ref,
    held: [bool; 128],
}
unsafe extern "C" fn callback(_: Ref, kind: u32, event: Ref, context: Ref) -> Ref {
    let tap = &mut *(context as *mut Tap);
    if kind == 0xfffffffe || kind == 0xffffffff {
        // A slow listener can be disabled by macOS. Re-enable only while the
        // user still permits monitoring; never request permissions here.
        RESET.fetch_add(1, Ordering::Relaxed);
        tap.held.fill(false);
        if CGPreflightListenEventAccess() {
            CGEventTapEnable(tap.port, true);
        }
        return event;
    }
    if event.is_null() {
        return event;
    }
    let input = match kind {
        10 | 11 | 12 => {
            let code = CGEventGetIntegerValueField(event, 9);
            if !(0..128).contains(&code) {
                return event;
            }
            let down = if kind == 12 {
                // Caps Lock is a toggle, so display one complete press per toggle.
                code == 57 || modifier_down(code, CGEventGetFlags(event), tap.held[code as usize])
            } else {
                kind == 10
            };
            let repeat = down
                && (tap.held[code as usize]
                    || (kind == 10 && CGEventGetIntegerValueField(event, 8) != 0));
            tap.held[code as usize] = down;
            keyboard_input(code, if down { "down" } else { "up" }, repeat)
        }
        1 | 3 => Some(Input {
            signal: if kind == 1 { "left" } else { "right" },
            x: 0.0,
            y: 0.0,
            key: None,
        }),
        22 => {
            let vertical = CGEventGetIntegerValueField(event, 11);
            let horizontal = CGEventGetIntegerValueField(event, 12);
            let delta = if vertical != 0 { vertical } else { horizontal };
            if delta == 0 {
                None
            } else {
                Some(Input {
                    signal: "wheel",
                    x: 0.0,
                    y: -(delta.signum() as f64),
                    key: None,
                })
            }
        }
        _ => None,
    };
    if let Some(input) = input {
        let point = if matches!(kind, 1 | 3) {
            let p = CGEventGetLocation(event);
            Some(crate::macos::Point { x: p.x, y: p.y })
        } else {
            None
        };
        if input.key.is_some() {
            RAW_KEYS.fetch_add(1, Ordering::Relaxed);
        } else {
            RAW_MOUSE.fetch_add(1, Ordering::Relaxed);
        }
        let target_pid = CGEventGetIntegerValueField(event, 40);
        let caps_lock = kind == 12 && CGEventGetIntegerValueField(event, 9) == 57;
        // Losing even one key-up must not leave the new held-hand pose stuck.
        if tap
            .sender
            .try_send(Event {
                input,
                target_pid,
                point,
            })
            .is_err()
        {
            DROPPED.fetch_add(1, Ordering::Relaxed);
            RESET.fetch_add(1, Ordering::Relaxed);
        }
        if caps_lock {
            tap.held[57] = false;
            if let Some(input) = keyboard_input(57, "up", false) {
                if tap
                    .sender
                    .try_send(Event {
                        input,
                        target_pid,
                        point: None,
                    })
                    .is_err()
                {
                    DROPPED.fetch_add(1, Ordering::Relaxed);
                    RESET.fetch_add(1, Ordering::Relaxed);
                }
            }
        }
    }
    // The tap is listen-only; returning the original event cannot swallow it.
    event
}
fn own_editor(app: &tauri::AppHandle) -> bool {
    app.webview_windows()
        .iter()
        .any(|(label, window)| label != "pet" && window.is_focused().unwrap_or(false))
}
fn emit(app: &tauri::AppHandle, input: Input) {
    let counter = match input.signal {
        "keyboard_left" => &LEFT,
        "keyboard_right" => &RIGHT,
        "enter" | "backspace" | "space" => &SPECIAL,
        _ => &MOUSE,
    };
    if app.emit_to("pet", "semantic-input", input).is_ok() {
        counter.fetch_add(1, Ordering::Relaxed);
    }
}
fn release_all(app: &tauri::AppHandle, held: &mut BTreeMap<u32, Input>) {
    for (_, mut input) in std::mem::take(held) {
        if let Some(key) = &mut input.key {
            key.phase = "up";
            key.repeat = false;
        }
        emit(app, input);
    }
}
pub fn start(app: tauri::AppHandle) {
    let (sender, receiver) = sync_channel::<Event>(64);
    std::thread::spawn(move || {
        let mut previous_gaze = None;
        let mut held = BTreeMap::new();
        let mut reset = RESET.load(Ordering::Relaxed);
        let mut last_poll = Instant::now() - Duration::from_millis(33);
        loop {
            let next = receiver.recv_timeout(Duration::from_millis(16));
            let generation = RESET.load(Ordering::Relaxed);
            let editor = own_editor(&app);
            if reset != generation {
                release_all(&app, &mut held);
                reset = generation;
                for _ in 0..64 {
                    if receiver.try_recv().is_err() {
                        break;
                    }
                }
                continue;
            }
            if !ACTIVE.load(Ordering::Relaxed) || editor {
                release_all(&app, &mut held);
                reset = generation;
            }
            if let Ok(event) = next {
                if let Some(point) = event.point {
                    crate::macos::dismiss_menu(&app, point, event.input.signal == "right");
                }
                let own = (event.target_pid == 0 || event.target_pid == std::process::id() as i64)
                    && editor;
                let tracked_release = event
                    .input
                    .key
                    .as_ref()
                    .is_some_and(|key| key.phase == "up" && held.contains_key(&key.code));
                if !own || tracked_release {
                    if let Some(key) = &event.input.key {
                        if key.phase == "up" {
                            held.remove(&key.code);
                        } else {
                            held.insert(key.code, event.input.clone());
                        }
                    }
                    emit(&app, event.input);
                }
            }
            if last_poll.elapsed() < Duration::from_millis(33) {
                continue;
            }
            last_poll = Instant::now();
            // Reconcile the physical state if macOS suppresses a release event
            // (for example during a secure-input transition).
            let released: Vec<_> = held
                .keys()
                .copied()
                .filter(|code| unsafe { !CGEventSourceKeyState(0, *code as u16) })
                .collect();
            for code in released {
                if let Some(mut input) = held.remove(&code) {
                    if let Some(key) = &mut input.key {
                        key.phase = "up";
                        key.repeat = false;
                    }
                    emit(&app, input);
                }
            }
            if own_editor(&app) {
                continue;
            }
            let point = unsafe {
                let event = CGEventCreate(ptr::null_mut());
                if event.is_null() {
                    continue;
                }
                let point = CGEventGetLocation(event);
                CFRelease(event);
                point
            };
            let Some(gaze) = crate::macos::gaze(
                &app,
                crate::macos::Point {
                    x: point.x,
                    y: point.y,
                },
            ) else {
                continue;
            };
            if previous_gaze != Some(gaze) {
                previous_gaze = Some(gaze);
                emit(
                    &app,
                    Input {
                        signal: "move",
                        x: gaze.0,
                        y: gaze.1,
                        key: None,
                    },
                );
            }
        }
    });
    std::thread::spawn(move || loop {
        unsafe {
            if !CGPreflightListenEventAccess() {
                STATUS.store(1, Ordering::Relaxed);
                ACTIVE.store(false, Ordering::Relaxed);
                std::thread::sleep(Duration::from_secs(2));
                continue;
            }
            let mut tap = Box::new(Tap {
                sender: sender.clone(),
                port: ptr::null_mut(),
                held: [false; 128],
            });
            let mask = [1, 3, 10, 11, 12, 22]
                .iter()
                .fold(0u64, |mask, kind| mask | (1u64 << kind));
            // Annotated session tap, tail placement, kCGEventTapOptionListenOnly.
            let port = CGEventTapCreate(2, 1, 1, mask, callback, (&mut *tap as *mut Tap).cast());
            if port.is_null() {
                STATUS.store(2, Ordering::Relaxed);
                std::thread::sleep(Duration::from_secs(2));
                continue;
            }
            tap.port = port;
            let source = CFMachPortCreateRunLoopSource(ptr::null_mut(), port, 0);
            if source.is_null() {
                CFMachPortInvalidate(port);
                CFRelease(port);
                STATUS.store(2, Ordering::Relaxed);
                std::thread::sleep(Duration::from_secs(2));
                continue;
            }
            let runloop = CFRunLoopGetCurrent();
            CFRunLoopAddSource(runloop, source, kCFRunLoopDefaultMode);
            CGEventTapEnable(port, true);
            while CGPreflightListenEventAccess() {
                ACTIVE.store(CGEventTapIsEnabled(port), Ordering::Relaxed);
                CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.5, false);
            }
            ACTIVE.store(false, Ordering::Relaxed);
            RESET.fetch_add(1, Ordering::Relaxed);
            CFRunLoopRemoveSource(runloop, source, kCFRunLoopDefaultMode);
            CFMachPortInvalidate(port);
            CFRelease(source);
            CFRelease(port);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hardware_mapping_preserves_regions_depth_and_special_keys() {
        for (code, vk) in [
            (0, 65),
            (12, 81),
            (32, 85),
            (4, 72),
            (36, 13),
            (76, 13),
            (51, 8),
            (49, 32),
            (123, 37),
            (126, 38),
            (82, 96),
            (122, 112),
            (111, 123),
        ] {
            assert_eq!(virtual_key(code), Some(vk));
            assert_eq!(
                keyboard_input(code, "down", false).unwrap().y,
                crate::model::key_depth(vk)
            );
        }
        assert_eq!(keyboard_input(36, "down", false).unwrap().signal, "enter");
        assert_eq!(
            keyboard_input(51, "down", false).unwrap().signal,
            "backspace"
        );
        assert_eq!(keyboard_input(49, "down", false).unwrap().signal, "space");
        assert_eq!(
            keyboard_input(55, "down", false).unwrap().signal,
            "keyboard_left"
        );
        assert_eq!(
            keyboard_input(54, "down", false).unwrap().signal,
            "keyboard_right"
        );
        assert_eq!(keyboard_input(55, "down", false).unwrap().y, 1.0);
        assert!(keyboard_input(999, "down", false).is_none());
    }
    #[test]
    fn labels_are_physical_and_payload_has_no_text() {
        assert_eq!(
            keyboard_input(55, "down", false)
                .unwrap()
                .key
                .unwrap()
                .label,
            "Cmd"
        );
        assert_eq!(
            keyboard_input(83, "down", false)
                .unwrap()
                .key
                .unwrap()
                .label,
            "1"
        );
        let payload = serde_json::to_value(keyboard_input(0, "down", false).unwrap()).unwrap();
        assert_eq!(payload["key"]["label"], "A");
        assert!(payload.get("text").is_none());
        assert!(payload.get("keycode").is_none());
    }
    #[test]
    fn modifier_sides_and_key_releases_have_distinct_identity() {
        assert!(modifier_down(56, (1 << 17) | 2, false));
        assert!(!modifier_down(56, (1 << 17) | 4, true));
        assert!(modifier_down(60, (1 << 17) | 4, false));
        assert!(!modifier_down(56, 0, true));
        let down = keyboard_input(76, "down", false).unwrap().key.unwrap();
        let up = keyboard_input(76, "up", false).unwrap().key.unwrap();
        assert_eq!(down.code, up.code);
        assert_eq!(up.phase, "up");
        assert_ne!(
            down.code,
            keyboard_input(36, "down", false).unwrap().key.unwrap().code
        );
        assert!(keyboard_input(0, "down", true).unwrap().key.unwrap().repeat);
    }
}
