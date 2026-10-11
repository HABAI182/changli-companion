//! Optional, local XInput polling. No controller input is logged or persisted.
#[cfg(windows)]
mod windows {
    use serde::Serialize;
    use std::{
        sync::atomic::{AtomicU32, Ordering},
        time::Duration,
    };
    use tauri::{Emitter, Manager};
    use windows_sys::Win32::UI::Input::XboxController::*;

    use crate::Runtime;

    static CONNECTED: AtomicU32 = AtomicU32::new(0);

    #[derive(Clone, Copy, Default, PartialEq, Debug)]
    struct Frame {
        buttons: u16,
        left_trigger: u8,
        right_trigger: u8,
        lx: i16,
        ly: i16,
        rx: i16,
        ry: i16,
    }
    impl From<XINPUT_GAMEPAD> for Frame {
        fn from(pad: XINPUT_GAMEPAD) -> Self {
            Self {
                buttons: pad.wButtons,
                left_trigger: pad.bLeftTrigger,
                right_trigger: pad.bRightTrigger,
                lx: pad.sThumbLX,
                ly: pad.sThumbLY,
                rx: pad.sThumbRX,
                ry: pad.sThumbRY,
            }
        }
    }
    #[derive(Clone, Serialize, Debug, PartialEq)]
    #[serde(rename_all = "camelCase")]
    struct GamepadEvent {
        controller: u32,
        control: &'static str,
        pressed: bool,
        value: f32,
        x: f32,
        y: f32,
    }
    const BUTTONS: [(&str, u16); 10] = [
        ("a", XINPUT_GAMEPAD_A),
        ("b", XINPUT_GAMEPAD_B),
        ("x", XINPUT_GAMEPAD_X),
        ("y", XINPUT_GAMEPAD_Y),
        ("lb", XINPUT_GAMEPAD_LEFT_SHOULDER),
        ("rb", XINPUT_GAMEPAD_RIGHT_SHOULDER),
        ("dpad_up", XINPUT_GAMEPAD_DPAD_UP),
        ("dpad_down", XINPUT_GAMEPAD_DPAD_DOWN),
        ("dpad_left", XINPUT_GAMEPAD_DPAD_LEFT),
        ("dpad_right", XINPUT_GAMEPAD_DPAD_RIGHT),
    ];
    fn button_event(controller: u32, control: &'static str, pressed: bool) -> GamepadEvent {
        GamepadEvent {
            controller,
            control,
            pressed,
            value: if pressed { 1.0 } else { 0.0 },
            x: 0.0,
            y: 0.0,
        }
    }
    fn axis(value: i16, deadzone: u16) -> f32 {
        if (value as i32).abs() <= deadzone as i32 {
            0.0
        } else {
            (value as f32 / 32767.0).clamp(-1.0, 1.0)
        }
    }
    fn stick_event(controller: u32, control: &'static str, x: f32, y: f32) -> GamepadEvent {
        GamepadEvent {
            controller,
            control,
            pressed: x != 0.0 || y != 0.0,
            value: x.hypot(y).min(1.0),
            x,
            y,
        }
    }
    fn changes(controller: u32, previous: Frame, next: Frame) -> Vec<GamepadEvent> {
        let mut events = Vec::new();
        for (control, bit) in BUTTONS {
            let before = previous.buttons & bit != 0;
            let after = next.buttons & bit != 0;
            if before != after {
                events.push(button_event(controller, control, after));
            }
        }
        for (control, before, after) in [
            ("lt", previous.left_trigger, next.left_trigger),
            ("rt", previous.right_trigger, next.right_trigger),
        ] {
            let was_pressed = before > XINPUT_GAMEPAD_TRIGGER_THRESHOLD as u8;
            let pressed = after > XINPUT_GAMEPAD_TRIGGER_THRESHOLD as u8;
            if was_pressed != pressed {
                let mut event = button_event(controller, control, pressed);
                event.value = after as f32 / 255.0;
                events.push(event);
            }
        }
        for (control, old_x, old_y, new_x, new_y, deadzone) in [
            (
                "left_stick",
                previous.lx,
                previous.ly,
                next.lx,
                next.ly,
                XINPUT_GAMEPAD_LEFT_THUMB_DEADZONE,
            ),
            (
                "right_stick",
                previous.rx,
                previous.ry,
                next.rx,
                next.ry,
                XINPUT_GAMEPAD_RIGHT_THUMB_DEADZONE,
            ),
        ] {
            let (old_x, old_y) = (axis(old_x, deadzone), axis(old_y, deadzone));
            let (x, y) = (axis(new_x, deadzone), axis(new_y, deadzone));
            // Compare quantized positions so gradual movement still emits; a
            // per-frame delta threshold could silently discard a slow sweep.
            if (old_x * 20.0).round() != (x * 20.0).round()
                || (old_y * 20.0).round() != (y * 20.0).round()
            {
                events.push(stick_event(controller, control, x, y));
            }
        }
        events
    }
    pub fn summary() -> String {
        format!(
            "XInput 当前连接 {} 个手柄（无输入记录）。",
            CONNECTED.load(Ordering::Relaxed)
        )
    }
    pub fn start(app: tauri::AppHandle) {
        std::thread::spawn(move || {
            let mut previous: [Option<Frame>; 4] = [None; 4];
            loop {
                let enabled = app
                    .state::<Runtime>()
                    .settings
                    .lock()
                    .map(|s| s.gamepad_enabled)
                    .unwrap_or(false);
                if !enabled {
                    previous = [None; 4];
                    CONNECTED.store(0, Ordering::Relaxed);
                    std::thread::sleep(Duration::from_millis(250));
                    continue;
                }
                let mut connected = 0;
                for index in 0..4 {
                    let mut state = XINPUT_STATE::default();
                    if unsafe { XInputGetState(index as u32, &mut state) } == 0 {
                        connected += 1;
                        let next = Frame::from(state.Gamepad);
                        for event in
                            changes(index as u32, previous[index].unwrap_or_default(), next)
                        {
                            let _ = app.emit_to("pet", "semantic-gamepad", event);
                        }
                        previous[index] = Some(next);
                    } else {
                        previous[index] = None;
                    }
                }
                CONNECTED.store(connected, Ordering::Relaxed);
                std::thread::sleep(Duration::from_millis(if connected > 0 { 33 } else { 250 }));
            }
        });
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn emits_button_edges_and_trigger_threshold_only() {
            let held = Frame {
                buttons: XINPUT_GAMEPAD_A | XINPUT_GAMEPAD_LEFT_SHOULDER,
                left_trigger: 31,
                ..Frame::default()
            };
            let pressed = changes(0, Frame::default(), held);
            assert!(pressed.iter().any(|e| e.control == "a" && e.pressed));
            assert!(pressed.iter().any(|e| e.control == "lb" && e.pressed));
            assert!(pressed.iter().any(|e| e.control == "lt" && e.pressed));
            assert!(changes(0, held, held).is_empty());
            assert!(changes(0, held, Frame::default())
                .iter()
                .any(|e| e.control == "a" && !e.pressed));
        }
        #[test]
        fn ignores_stick_deadzone_and_emits_center_return() {
            let slight = Frame {
                lx: 1000,
                ..Frame::default()
            };
            assert!(changes(0, Frame::default(), slight).is_empty());
            let moved = Frame {
                lx: 20000,
                ..Frame::default()
            };
            assert!(changes(0, slight, moved)
                .iter()
                .any(|e| e.control == "left_stick" && e.x > 0.5));
            assert!(changes(0, moved, Frame::default())
                .iter()
                .any(|e| e.control == "left_stick" && !e.pressed));
            let gradual = Frame {
                lx: 20500,
                ..Frame::default()
            };
            assert!(changes(0, moved, gradual)
                .iter()
                .any(|e| e.control == "left_stick" && e.pressed));
        }
    }
}

pub fn start(app: tauri::AppHandle) {
    #[cfg(windows)]
    windows::start(app);
    #[cfg(not(windows))]
    let _ = app;
}
pub fn summary() -> String {
    #[cfg(windows)]
    return windows::summary();
    #[cfg(not(windows))]
    return "手柄监听仅 Windows 可用。".into();
}
