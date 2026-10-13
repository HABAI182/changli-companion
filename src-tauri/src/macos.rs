//! macOS desktop metadata in global desktop points. No window titles, screen
//! images or Accessibility permission requests are used.
use objc2::{
    msg_send,
    runtime::{AnyClass, AnyObject},
};
use objc2_foundation::NSRect;
use std::{
    ffi::{c_void, CStr},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc,
    },
    time::Duration,
};
use tauri::Manager;

static LAST_FULLSCREEN: AtomicBool = AtomicBool::new(false);
type Ref = *const c_void;
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct Rect {
    pub origin: Point,
    pub size: Size,
}

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGWindowListCopyWindowInfo(options: u32, relative_to: u32) -> Ref;
    static kCGWindowOwnerPID: Ref;
    static kCGWindowLayer: Ref;
    static kCGWindowAlpha: Ref;
    static kCGWindowBounds: Ref;
    fn CGRectMakeWithDictionaryRepresentation(dict: Ref, rect: *mut Rect) -> bool;
    fn CGMainDisplayID() -> u32;
    fn CGDisplayBounds(display: u32) -> Rect;
    fn CGGetActiveDisplayList(max: u32, displays: *mut u32, count: *mut u32) -> i32;
}
#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFArrayGetCount(array: Ref) -> isize;
    fn CFArrayGetValueAtIndex(array: Ref, index: isize) -> Ref;
    fn CFDictionaryGetValue(dict: Ref, key: Ref) -> Ref;
    fn CFNumberGetValue(number: Ref, kind: isize, value: *mut c_void) -> bool;
    fn CFRelease(value: Ref);
}

pub fn on_main<T: Send + 'static>(
    app: &tauri::AppHandle,
    f: impl FnOnce(tauri::AppHandle) -> T + Send + 'static,
) -> Option<T> {
    if objc2::MainThreadMarker::new().is_some() {
        return Some(f(app.clone()));
    }
    let (tx, rx) = mpsc::sync_channel(1);
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let _ = tx.send(f(handle));
    })
    .ok()?;
    rx.recv_timeout(Duration::from_millis(250)).ok()
}

// All AppKit messages execute on the main thread; Tauri owns the NSWindow.
unsafe fn native_window(app: &tauri::AppHandle, label: &str) -> Option<*mut AnyObject> {
    let pointer = app.get_webview_window(label)?.ns_window().ok()?;
    (!pointer.is_null()).then_some(pointer.cast())
}
pub fn window_rect_on_main(app: &tauri::AppHandle, label: &str) -> Option<Rect> {
    unsafe {
        let window = native_window(app, label)?;
        let frame: NSRect = msg_send![window, frame];
        // Cocoa's lower-left origin -> CoreGraphics' upper-left main-screen origin.
        Some(Rect {
            origin: Point {
                x: frame.origin.x,
                y: CGDisplayBounds(CGMainDisplayID()).size.height
                    - frame.origin.y
                    - frame.size.height,
            },
            size: Size {
                width: frame.size.width,
                height: frame.size.height,
            },
        })
    }
}
pub fn gaze(app: &tauri::AppHandle, point: Point) -> Option<(f64, f64)> {
    on_main(app, move |app| {
        let rect = window_rect_on_main(&app, "pet")?;
        Some(super::input::cursor_gaze(
            (point.x, point.y),
            (rect.origin.x, rect.origin.y),
            (rect.size.width, rect.size.height),
        ))
    })
    .flatten()
}
fn inside(point: Point, rect: Rect) -> bool {
    point.x >= rect.origin.x
        && point.y >= rect.origin.y
        && point.x < rect.origin.x + rect.size.width
        && point.y < rect.origin.y + rect.size.height
}
pub fn dismiss_menu(app: &tauri::AppHandle, point: Point, right_click: bool) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if !crate::pet_menu::is_open() {
            return;
        }
        if right_click
            && window_rect_on_main(&handle, "pet").is_some_and(|rect| inside(point, rect))
        {
            return;
        }
        if window_rect_on_main(&handle, "pet-menu").is_some_and(|rect| !inside(point, rect)) {
            let _ = crate::pet_menu::close_pet_menu(handle);
        }
    });
}
fn covers_screen(window: Rect, screen: Rect) -> bool {
    let tolerance = 2.0;
    window.size.width > 0.0
        && window.size.height > 0.0
        && (window.origin.x - screen.origin.x).abs() <= tolerance
        && (window.origin.y - screen.origin.y).abs() <= tolerance
        && (window.origin.x + window.size.width - screen.origin.x - screen.size.width).abs()
            <= tolerance
        && (window.origin.y + window.size.height - screen.origin.y - screen.size.height).abs()
            <= tolerance
}
fn pet_display(pet: Rect, displays: &[Rect]) -> Option<Rect> {
    displays
        .iter()
        .copied()
        .map(|screen| {
            let width = ((pet.origin.x + pet.size.width).min(screen.origin.x + screen.size.width)
                - pet.origin.x.max(screen.origin.x))
            .max(0.0);
            let height = ((pet.origin.y + pet.size.height)
                .min(screen.origin.y + screen.size.height)
                - pet.origin.y.max(screen.origin.y))
            .max(0.0);
            (screen, width * height)
        })
        .filter(|(_, area)| *area > 0.0)
        .max_by(|a, b| a.1.total_cmp(&b.1))
        .map(|(screen, _)| screen)
}
unsafe fn number(dict: Ref, key: Ref) -> Option<f64> {
    let value = CFDictionaryGetValue(dict, key);
    if value.is_null() {
        return None;
    }
    let mut result = 0.0f64;
    CFNumberGetValue(value, 6, (&mut result as *mut f64).cast()).then_some(result)
}
unsafe fn string(object: *mut AnyObject) -> Option<String> {
    if object.is_null() {
        return None;
    }
    let text: *const std::ffi::c_char = msg_send![object, UTF8String];
    (!text.is_null()).then(|| CStr::from_ptr(text).to_string_lossy().into_owned())
}
fn matches_exception(bundle: &str, identifier: &str, exceptions: &[String]) -> bool {
    exceptions
        .iter()
        .any(|e| e.trim().eq_ignore_ascii_case(bundle) || e.trim().eq_ignore_ascii_case(identifier))
}
unsafe fn fullscreen_on_main(app: &tauri::AppHandle, exceptions: &[String]) -> bool {
    let Some(class) = AnyClass::get(c"NSWorkspace") else {
        return false;
    };
    let workspace: *mut AnyObject = msg_send![class, sharedWorkspace];
    let foreground: *mut AnyObject = msg_send![workspace, frontmostApplication];
    if foreground.is_null() {
        return false;
    }
    let pid: i32 = msg_send![foreground, processIdentifier];
    if pid == std::process::id() as i32 {
        return false;
    }
    let id: *mut AnyObject = msg_send![foreground, bundleIdentifier];
    let identifier = string(id).unwrap_or_default();
    // Desktop and Dock must never trigger fullscreen avoidance.
    if [
        "com.apple.finder",
        "com.apple.dock",
        "com.apple.loginwindow",
    ]
    .contains(&identifier.as_str())
    {
        return false;
    }
    let url: *mut AnyObject = msg_send![foreground, bundleURL];
    let name: *mut AnyObject = msg_send![url, lastPathComponent];
    if matches_exception(&string(name).unwrap_or_default(), &identifier, exceptions) {
        return false;
    }
    // NSWindow.screen may be nil after auto-hide. Derive the display from the
    // retained window frame so the watcher cannot oscillate hide/show.
    let Some(pet) = window_rect_on_main(app, "pet") else {
        return false;
    };
    let mut displays = [0u32; 32];
    let mut count = 0;
    if CGGetActiveDisplayList(displays.len() as u32, displays.as_mut_ptr(), &mut count) != 0 {
        return false;
    }
    let bounds: Vec<_> = displays[..count as usize]
        .iter()
        .map(|display| CGDisplayBounds(*display))
        .collect();
    let Some(bounds) = pet_display(pet, &bounds) else {
        return false;
    };
    // Visible windows are returned front-to-back. Only the foremost normal
    // window of the active application can determine avoidance on this display.
    let windows = CGWindowListCopyWindowInfo(1 | 16, 0);
    if windows.is_null() {
        return false;
    }
    let mut full = false;
    for index in 0..CFArrayGetCount(windows) {
        let window = CFArrayGetValueAtIndex(windows, index);
        if number(window, kCGWindowOwnerPID) != Some(pid as f64)
            || number(window, kCGWindowLayer) != Some(0.0)
            || number(window, kCGWindowAlpha).unwrap_or(0.0) <= 0.0
        {
            continue;
        }
        let dict = CFDictionaryGetValue(window, kCGWindowBounds);
        let mut rect = Rect::default();
        if !dict.is_null() && CGRectMakeWithDictionaryRepresentation(dict, &mut rect) {
            full = covers_screen(rect, bounds);
        }
        break;
    }
    CFRelease(windows);
    full
}
pub fn external_fullscreen(app: &tauri::AppHandle, exceptions: &[String]) -> bool {
    let exceptions = exceptions.to_vec();
    on_main(app, move |app| {
        let full = unsafe { fullscreen_on_main(&app, &exceptions) };
        LAST_FULLSCREEN.store(full, Ordering::Relaxed);
        full
    })
    .unwrap_or_else(|| LAST_FULLSCREEN.load(Ordering::Relaxed))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn rect(x: f64, y: f64, width: f64, height: f64) -> Rect {
        Rect {
            origin: Point { x, y },
            size: Size { width, height },
        }
    }
    #[test]
    fn fullscreen_does_not_match_zoomed_or_other_display_windows() {
        let screen = rect(-1920.0, 0.0, 1920.0, 1080.0);
        assert!(covers_screen(screen, screen));
        assert!(covers_screen(rect(-1919.0, 1.0, 1918.0, 1078.0), screen));
        assert!(!covers_screen(rect(-1920.0, 25.0, 1920.0, 995.0), screen));
        assert!(!covers_screen(rect(0.0, 0.0, 1920.0, 1080.0), screen));
        assert!(!covers_screen(rect(-1920.0, 0.0, 3840.0, 1080.0), screen));
    }
    #[test]
    fn hidden_pet_frame_selects_its_display_in_desktop_points() {
        let screens = [
            rect(-1920.0, 0.0, 1920.0, 1080.0),
            rect(0.0, 0.0, 1512.0, 982.0),
        ];
        assert_eq!(
            pet_display(rect(-500.0, 200.0, 360.0, 320.0), &screens)
                .unwrap()
                .origin
                .x,
            -1920.0
        );
        assert_eq!(
            pet_display(rect(-50.0, 200.0, 360.0, 320.0), &screens)
                .unwrap()
                .origin
                .x,
            0.0
        );
        assert!(pet_display(rect(4000.0, 0.0, 360.0, 320.0), &screens).is_none());
    }
    #[test]
    fn exceptions_match_exact_app_bundle_or_identifier() {
        let exceptions = vec![" Safari.app ".into(), "com.example.game".into()];
        assert!(matches_exception(
            "Safari.app",
            "com.apple.Safari",
            &exceptions
        ));
        assert!(matches_exception(
            "Game.app",
            "com.example.game",
            &exceptions
        ));
        assert!(!matches_exception(
            "OtherSafari.app",
            "com.apple.OtherSafari",
            &exceptions
        ));
    }
}
