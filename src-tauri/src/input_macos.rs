//! macOS-only passive input adapter. No text extraction, event modification,
//! input injection, disk logs, or additional Cargo dependencies.
use super::*;
use std::{
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
    fn CFRelease(value: Ref);
}
// 0: starting; 1: awaiting Input Monitoring; 2: tap unavailable.
static STATUS: AtomicU8 = AtomicU8::new(0);
pub fn status() -> &'static str {
    match STATUS.load(Ordering::Relaxed) {
        1 => "macOS 鼠标视线跟随可用；全局键鼠监听等待授权。请在系统设置 → 隐私与安全性 → 输入监控中添加并允许离火长明，必要时退出并重新打开应用。",
        2 => "macOS 鼠标视线跟随可用；全局监听注册失败，正在重试。请检查输入监控权限；安全输入期间 macOS 可能暂停键盘事件。",
        _ => "macOS 输入监听正在初始化。",
    }
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
fn keyboard_input(code: i64) -> Option<Input> {
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
            phase: "down",
        }),
    })
}
fn modifier_pressed(code: i64, previous: u64, current: u64) -> bool {
    let mask = match code {
        57 => 1 << 16,
        56 | 60 => 1 << 17,
        59 | 62 => 1 << 18,
        58 | 61 => 1 << 19,
        54 | 55 => 1 << 20,
        63 => 1 << 23,
        _ => return false,
    };
    if code == 57 {
        (previous ^ current) & mask != 0
    } else {
        previous & mask == 0 && current & mask != 0
    }
}
struct Event {
    input: Input,
    target_pid: i64,
}
struct Tap {
    sender: SyncSender<Event>,
    port: Ref,
    flags: u64,
}
unsafe extern "C" fn callback(_: Ref, kind: u32, event: Ref, context: Ref) -> Ref {
    let tap = &mut *(context as *mut Tap);
    if kind == 0xfffffffe || kind == 0xffffffff {
        // A slow listener can be disabled by macOS. Re-enable only while the
        // user still permits monitoring; never request permissions here.
        if CGPreflightListenEventAccess() {
            CGEventTapEnable(tap.port, true);
        }
        return event;
    }
    if event.is_null() {
        return event;
    }
    let input = match kind {
        10 => keyboard_input(CGEventGetIntegerValueField(event, 9)),
        12 => {
            let flags = CGEventGetFlags(event);
            let code = CGEventGetIntegerValueField(event, 9);
            let pressed = modifier_pressed(code, tap.flags, flags);
            tap.flags = flags;
            if pressed {
                keyboard_input(code)
            } else {
                None
            }
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
        // Bounded, nonblocking delivery: never stall the user's input stream.
        let _ = tap.sender.try_send(Event {
            input,
            target_pid: CGEventGetIntegerValueField(event, 40),
        });
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
fn gaze_from_points(
    point: Point,
    position: (f64, f64),
    size: (f64, f64),
    scale: f64,
) -> (f64, f64) {
    // CGEvent locations use desktop points, Tauri outer bounds use physical
    // pixels. Both origins are the top-left of the main screen, including
    // negative coordinates. Scale with the pet's screen, never the main DPI.
    cursor_gaze((point.x * scale, point.y * scale), position, size)
}
pub fn start(app: tauri::AppHandle) {
    let (sender, receiver) = sync_channel::<Event>(64);
    std::thread::spawn(move || {
        let mut previous_gaze = None;
        let mut last_poll = Instant::now() - Duration::from_millis(33);
        loop {
            if let Ok(event) = receiver.recv_timeout(Duration::from_millis(16)) {
                let own = (event.target_pid == 0 || event.target_pid == std::process::id() as i64)
                    && own_editor(&app);
                if !own {
                    emit(&app, event.input);
                }
            }
            if last_poll.elapsed() < Duration::from_millis(33) {
                continue;
            }
            last_poll = Instant::now();
            if own_editor(&app) {
                continue;
            }
            let Some(pet) = app.get_webview_window("pet") else {
                continue;
            };
            let (Ok(position), Ok(size), Ok(scale)) =
                (pet.outer_position(), pet.outer_size(), pet.scale_factor())
            else {
                continue;
            };
            let point = unsafe {
                let event = CGEventCreate(ptr::null_mut());
                if event.is_null() {
                    continue;
                }
                let point = CGEventGetLocation(event);
                CFRelease(event);
                point
            };
            let gaze = gaze_from_points(
                point,
                (position.x as f64, position.y as f64),
                (size.width as f64, size.height as f64),
                scale,
            );
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
            let initial = CGEventCreate(ptr::null_mut());
            let flags = if initial.is_null() {
                0
            } else {
                let flags = CGEventGetFlags(initial);
                CFRelease(initial);
                flags
            };
            let mut tap = Box::new(Tap {
                sender: sender.clone(),
                port: ptr::null_mut(),
                flags,
            });
            let mask = [1, 3, 10, 12, 22]
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
            assert_eq!(keyboard_input(code).unwrap().y, crate::model::key_depth(vk));
        }
        assert_eq!(keyboard_input(36).unwrap().signal, "enter");
        assert_eq!(keyboard_input(51).unwrap().signal, "backspace");
        assert_eq!(keyboard_input(49).unwrap().signal, "space");
        assert_eq!(keyboard_input(55).unwrap().signal, "keyboard_left");
        assert_eq!(keyboard_input(54).unwrap().signal, "keyboard_right");
        assert_eq!(keyboard_input(55).unwrap().y, 1.0);
        assert!(keyboard_input(999).is_none());
    }
    #[test]
    fn labels_are_physical_and_payload_has_no_text() {
        assert_eq!(keyboard_input(55).unwrap().key.unwrap().label, "Cmd");
        assert_eq!(keyboard_input(83).unwrap().key.unwrap().label, "1");
        let payload = serde_json::to_value(keyboard_input(0).unwrap()).unwrap();
        assert_eq!(payload["key"]["label"], "A");
        assert!(payload.get("text").is_none());
        assert!(payload.get("keycode").is_none());
    }
    #[test]
    fn modifier_release_and_repeats_do_not_generate_presses() {
        assert!(modifier_pressed(56, 0, 1 << 17));
        assert!(!modifier_pressed(56, 1 << 17, 0));
        assert!(!modifier_pressed(56, 1 << 17, 1 << 17));
        assert!(modifier_pressed(55, 0, 1 << 20));
        assert!(modifier_pressed(57, 1 << 16, 0));
        assert!(!modifier_pressed(999, 0, u64::MAX));
    }
    #[test]
    fn retina_and_negative_screen_coordinates_match_pet_bounds() {
        let point = Point {
            x: -1168.0,
            y: 460.0,
        };
        let one = gaze_from_points(point, (-1600.0, 300.0), (360.0, 320.0), 1.0);
        let two = gaze_from_points(point, (-3200.0, 600.0), (720.0, 640.0), 2.0);
        assert_eq!(one, two);
        assert!((one.0 - 0.5).abs() < 1e-12);
        assert_eq!(
            gaze_from_points(
                Point {
                    x: -1420.0,
                    y: 460.0
                },
                (-3200.0, 600.0),
                (720.0, 640.0),
                2.0
            ),
            (0.0, 0.0)
        );
    }
}
