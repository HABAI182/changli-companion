use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::Manager;
#[derive(Clone, Serialize, Deserialize)]
pub struct Binding {
    #[serde(default)]
    pub id: String,
    #[serde(default = "enabled_by_default")]
    pub enabled: bool,
    pub shortcut: String,
    #[serde(default)]
    pub expression: String,
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub trigger: String,
    #[serde(default)]
    pub action: Action,
}
#[derive(Clone, Serialize, Deserialize, Default)]
pub struct Action {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
}
fn enabled_by_default() -> bool {
    true
}
#[derive(Clone, Deserialize)]
pub struct KeyBindings {
    pub left_vkeys: Vec<u32>,
    pub right_vkeys: Vec<u32>,
    pub fallback: String,
}
#[derive(Clone, Deserialize)]
pub struct Model {
    pub key_bindings: KeyBindings,
    pub shortcuts: Vec<Binding>,
}
static KEYS: OnceLock<KeyBindings> = OnceLock::new();
pub fn initialize(app: &tauri::AppHandle) -> Result<Model, Box<dyn std::error::Error>> {
    let path = app.path().app_data_dir()?.join("model.json");
    if !path.exists() {
        std::fs::write(
            &path,
            include_str!("../../public/models/changli/model.json"),
        )?;
    }
    let mut saved: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&path)?)?;
    if saved["schema"].as_u64() == Some(1) {
        // Preserve user key mapping and existing 8 shortcuts when adding v2 slots.
        let backup = path.with_file_name("model.schema1.backup.json");
        if !backup.exists() {
            std::fs::copy(&path, &backup)?;
        }
        let mut upgraded: serde_json::Value =
            serde_json::from_str(include_str!("../../public/models/changli/model.json"))?;
        if saved["key_bindings"].is_object() {
            upgraded["key_bindings"] = saved["key_bindings"].take();
        }
        if let Some(old) = saved["shortcuts"].as_array() {
            for (i, binding) in old.iter().take(8).enumerate() {
                if let Some(shortcut) = binding["shortcut"].as_str() {
                    upgraded["shortcuts"][i]["shortcut"] = shortcut.into();
                    upgraded["shortcuts"][i]["enabled"] = true.into();
                }
                if let Some(expression) = binding["expression"].as_str() {
                    upgraded["shortcuts"][i]["expression"] = expression.into();
                    upgraded["shortcuts"][i]["action"]["id"] = expression.into();
                }
                if let Some(mode) = binding["mode"].as_str() {
                    upgraded["shortcuts"][i]["mode"] = mode.into();
                    upgraded["shortcuts"][i]["trigger"] = mode.into();
                }
            }
        }
        std::fs::write(&path, serde_json::to_vec_pretty(&upgraded)?)?;
        saved = upgraded;
    }
    // Existing installs keep their explicit key assignments. Fill previously
    // unassigned number/function/punctuation keys from the bundled regions.
    let bundled: serde_json::Value =
        serde_json::from_str(include_str!("../../public/models/changli/model.json"))?;
    let mut regions_changed = false;
    // Retired player actions cannot remain active in saved shortcut slots.
    if let Some(slots)=saved["shortcuts"].as_array_mut() {
        for slot in slots {
            if slot["action"]["type"]=="animation" &&
                matches!(slot["action"]["id"].as_str(),Some("wave" | "sleep")) {
                slot["enabled"]=false.into();
                slot["action"]=serde_json::json!({"type":"expression","id":"default"});
                regions_changed=true;
            }
        }
    }
    for region in ["left_vkeys", "right_vkeys"] {
        if let Some(defaults) = bundled["key_bindings"][region].as_array() {
            for key in defaults {
                let assigned = ["left_vkeys", "right_vkeys"].iter().any(|side|
                    saved["key_bindings"][side].as_array().is_some_and(|keys| keys.contains(key)));
                if !assigned {
                    if let Some(keys) = saved["key_bindings"][region].as_array_mut() {
                        keys.push(key.clone());
                        regions_changed = true;
                    }
                }
            }
        }
    }
    if regions_changed {
        std::fs::write(&path, serde_json::to_vec_pretty(&saved)?)?;
    }
    let model: Model = serde_json::from_value(saved)?;
    if model.shortcuts.len() != 25 {
        return Err("当前模型必须有 25 个动作槽，请检查 model.json".into());
    }
    let _ = KEYS.set(model.key_bindings.clone());
    Ok(model)
}
pub fn key_region(vk: u32) -> &'static str {
    match KEYS.get() {
        Some(k) if k.left_vkeys.contains(&vk) => "keyboard_left",
        Some(k) if k.right_vkeys.contains(&vk) => "keyboard_right",
        Some(k) if k.fallback == "keyboard_left" => "keyboard_left",
        _ => "keyboard_right",
    }
}
// Physical layout, identical to frontend keyDepth; no typed-text conversion.
pub fn key_depth(vk: u32) -> f64 {
    if [65,83,68,70,71,72,74,75,76,90,88,67,86,66,78,77,
        16,17,18,20,32,37,38,39,40,160,161,162,163,164,165,186,188,190,191,222,
        96,97,98,99,100,101,102,110].contains(&vk) { 1.0 } else { -1.0 }
}
#[cfg(test)]
mod depth_tests {
    #[test]
    fn full_rows_share_depth_and_modifiers_and_space_are_near() {
        for vk in [0x51,0x54,0x59,0x50,0x31,0x30,0x70,0x7b,0x08] { assert_eq!(super::key_depth(vk),-1.0); }
        for vk in [0x41,0x47,0x48,0x4c,0x5a,0x42,0x4e,0x4d,0x20,0xa0,0xa1] { assert_eq!(super::key_depth(vk),1.0); }
    }
}
pub fn save_shortcuts(app: &tauri::AppHandle, slots: &[Binding]) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("model.json");
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut model: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    model["shortcuts"] = serde_json::to_value(slots).map_err(|e| e.to_string())?;
    std::fs::write(
        path,
        serde_json::to_vec_pretty(&model).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}
