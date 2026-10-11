use rusqlite::{params, Connection};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub struct Database(pub Mutex<Connection>);
#[derive(Serialize)]
pub struct Snapshot {
    pub revision: i64,
    pub json: Option<String>,
}

pub fn initialize(app: &tauri::AppHandle) -> Result<Database, Box<dyn std::error::Error>> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;
    let db = Connection::open(dir.join("companion.sqlite3"))?;
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,json TEXT); INSERT OR IGNORE INTO state VALUES(1,0,NULL); CREATE TABLE IF NOT EXISTS window_geometry(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL);")?;
    // Seed the same document shape as the frontend before tray actions can occur.
    let initial = serde_json::json!({"version":1,"todos":[],"priority":null,"session":null,"records":[],"settings":crate::Settings::default()});
    db.execute(
        "UPDATE state SET json=?1 WHERE id=1 AND json IS NULL",
        [initial.to_string()],
    )?;
    Ok(Database(Mutex::new(db)))
}
#[tauri::command]
pub fn load_data(db: tauri::State<Database>) -> Result<Snapshot, String> {
    db.0.lock()
        .map_err(|_| "存储锁失败".to_string())?
        .query_row("SELECT revision,json FROM state WHERE id=1", [], |r| {
            Ok(Snapshot {
                revision: r.get(0)?,
                json: r.get(1)?,
            })
        })
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn save_data(
    app: tauri::AppHandle,
    db: tauri::State<Database>,
    expected: i64,
    json: String,
) -> Result<bool, String> {
    if json.len() > 4_000_000 {
        return Err("本地数据超过 4 MB 上限，请先备份归档".into());
    }
    let _: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let saved =
        db.0.lock()
            .map_err(|_| "存储锁失败".to_string())?
            .execute(
                "UPDATE state SET revision=revision+1,json=?1 WHERE id=1 AND revision=?2",
                params![json, expected],
            )
            .map_err(|e| e.to_string())?
            == 1;
    if saved {
        let _ = app.emit("data-changed", ());
    }
    Ok(saved)
}
pub fn recover_passthrough(app: &tauri::AppHandle) -> Result<(), String> {
    let db = app.state::<Database>();
    let conn = db.0.lock().map_err(|_| "存储锁失败".to_string())?;
    let json: Option<String> = conn
        .query_row("SELECT json FROM state WHERE id=1", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if let Some(raw) = json {
        let mut value: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        value["settings"]["passthrough"] = false.into();
        conn.execute(
            "UPDATE state SET revision=revision+1,json=?1 WHERE id=1",
            [value.to_string()],
        )
        .map_err(|e| e.to_string())?;
    }
    drop(conn);
    let _ = app.emit("data-changed", ());
    Ok(())
}
pub fn update_setting(
    app: &tauri::AppHandle,
    key: &str,
    value: serde_json::Value,
) -> Result<(), String> {
    let db = app.state::<Database>();
    let conn = db.0.lock().map_err(|_| "存储锁失败")?;
    let raw: Option<String> = conn
        .query_row("SELECT json FROM state WHERE id=1", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if let Some(raw) = raw {
        let mut data: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        data["settings"][key] = value;
        conn.execute(
            "UPDATE state SET revision=revision+1,json=?1 WHERE id=1",
            [data.to_string()],
        )
        .map_err(|e| e.to_string())?;
    }
    drop(conn);
    let _ = app.emit("data-changed", ());
    Ok(())
}
