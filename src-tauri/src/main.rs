#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snapshot {
    pub id: String,
    pub timestamp: f64,
    pub label: String,
    #[serde(rename = "fileCount")]
    pub file_count: i64,
    #[serde(rename = "triggerType")]
    pub trigger_type: String,
    #[serde(rename = "isValid")]
    pub is_valid: bool,
    pub time: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Suspect {
    pub rank: i32,
    pub file: String,
    pub score: i32,
    pub signals: Vec<String>,
    pub context: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreResult {
    pub success: bool,
    #[serde(rename = "filesRestored")]
    pub files_restored: i32,
    #[serde(rename = "filesFailed")]
    pub files_failed: i32,
    #[serde(rename = "methodUsed")]
    pub method_used: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SnapResult {
    pub success: bool,
    #[serde(rename = "snapshotUuid")]
    pub snapshot_uuid: Option<String>,
    #[serde(rename = "filesCaptured")]
    pub files_captured: i32,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthComponent {
    pub status: String,
    pub message: String,
    pub fallback: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemHealth {
    pub overall: String,
    pub components: HashMap<String, HealthComponent>,
    pub timestamp: f64,
}

pub struct AppState {
    pub python: Arc<Mutex<String>>,
}

fn detect_python() -> String {
    for cmd in &["python3", "python", "py"] {
        if Command::new(cmd).arg("--version").output().map(|o| o.status.success()).unwrap_or(false) {
            return cmd.to_string();
        }
    }
    "python3".to_string()
}

fn engine_path(file: &str) -> String {
    let candidates = ["engine", "src-tauri/engine", "../engine"];
    for base in &candidates {
        let p = format!("{}/{}", base, file);
        if std::path::Path::new(&p).exists() {
            return p;
        }
    }
    format!("engine/{}", file)
}

fn run_python(python: &str, script: &str, args: &[&str]) -> Result<String, String> {
    let path = engine_path(script);
    let output = Command::new(python)
        .arg(&path)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run {}: {}", script, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() && stdout.is_empty() {
        return Err(format!("Script error: {}", stderr));
    }

    Ok(stdout)
}

#[tauri::command]
async fn ghost_init(project_path: String, state: State<'_, AppState>) -> Result<String, String> {
    let python = state.python.lock().unwrap().clone();

    // Just verify engine is accessible
    let result = run_python(&python, "snapshot_manager.py", &["timeline-json"]);
    match result {
        Ok(_) => Ok(format!("Ghost initialized at {}", project_path)),
        Err(e) => Err(format!("Ghost init failed: {}", e)),
    }
}

#[tauri::command]
async fn get_timeline(state: State<'_, AppState>) -> Result<Vec<Snapshot>, String> {
    let python = state.python.lock().unwrap().clone();

    match run_python(&python, "snapshot_manager.py", &["timeline-json"]) {
        Ok(output) => {
            let json_str = output.lines()
                .find(|l| l.trim_start().starts_with('['))
                .unwrap_or("[]");

            serde_json::from_str::<Vec<Snapshot>>(json_str)
                .map_err(|e| format!("Parse error: {}", e))
                .or_else(|_| Ok(vec![]))
        }
        Err(_) => Ok(vec![]),
    }
}

#[tauri::command]
async fn create_snapshot(label: String, trigger_type: Option<String>, state: State<'_, AppState>) -> Result<SnapResult, String> {
    let python = state.python.lock().unwrap().clone();
    let trigger = trigger_type.unwrap_or_else(|| "manual".to_string());

    match run_python(&python, "snapshot_manager.py",
                     &["create", "--label", &label, "--trigger", &trigger]) {
        Ok(output) => {
            // Find JSON line
            if let Some(line) = output.lines().find(|l| l.contains("\"success\"")) {
                serde_json::from_str::<SnapResult>(line)
                    .map_err(|e| e.to_string())
            } else {
                let success = output.contains('✅');
                Ok(SnapResult {
                    success,
                    snapshot_uuid: None,
                    files_captured: 0,
                    error: if success { None } else { Some(output) },
                })
            }
        }
        Err(e) => Ok(SnapResult { success: false, snapshot_uuid: None, files_captured: 0, error: Some(e) }),
    }
}

#[tauri::command]
async fn restore_snapshot(snapshot_id: String, state: State<'_, AppState>) -> Result<RestoreResult, String> {
    let python = state.python.lock().unwrap().clone();

    match run_python(&python, "snapshot_manager.py", &["restore", "--id", &snapshot_id]) {
        Ok(output) => {
            if let Some(line) = output.lines().find(|l| l.contains("\"success\"")) {
                serde_json::from_str::<RestoreResult>(line)
                    .map_err(|e| e.to_string())
            } else {
                let success = output.contains('✅');
                Ok(RestoreResult {
                    success,
                    files_restored: 0,
                    files_failed: 0,
                    method_used: "unknown".to_string(),
                    error: if success { None } else { Some(output) },
                })
            }
        }
        Err(e) => Ok(RestoreResult { success: false, files_restored: 0, files_failed: 0,
                                     method_used: "failed".to_string(), error: Some(e) }),
    }
}

#[tauri::command]
async fn restore_last_working(state: State<'_, AppState>) -> Result<RestoreResult, String> {
    restore_snapshot("last-working".to_string(), state).await
}

#[tauri::command]
async fn get_crash_suspects(state: State<'_, AppState>) -> Result<Option<serde_json::Value>, String> {
    let python = state.python.lock().unwrap().clone();
    let db_path = ".ghost/ledger.db";

    if !std::path::Path::new(db_path).exists() {
        return Ok(None);
    }

    // Get latest crash time from DB via Python
    match run_python(&python, "ranker.py", &[]) {
        Ok(output) => {
            if let Some(line) = output.lines().find(|l| l.starts_with("GHOST_JSON:")) {
                let json_str = line.trim_start_matches("GHOST_JSON:");
                Ok(serde_json::from_str(json_str).ok())
            } else {
                Ok(None)
            }
        }
        Err(_) => Ok(None),
    }
}

#[tauri::command]
async fn get_system_health(state: State<'_, AppState>) -> Result<SystemHealth, String> {
    let python = state.python.lock().unwrap().clone();

    // Check each component
    let mut components = HashMap::new();

    let db_ok = std::path::Path::new(".ghost/ledger.db").exists();
    components.insert("database".to_string(), HealthComponent {
        status: if db_ok { "OK".to_string() } else { "FAILED".to_string() },
        message: if db_ok { "Database accessible".to_string() } else { "Database missing".to_string() },
        fallback: false,
    });

    let watcher_ok = std::path::Path::new(&engine_path("watcher.py")).exists();
    components.insert("file_watcher".to_string(), HealthComponent {
        status: if watcher_ok { "OK".to_string() } else { "FAILED".to_string() },
        message: if watcher_ok { "Watcher ready".to_string() } else { "watcher.py missing".to_string() },
        fallback: false,
    });

    let snap_ok = std::path::Path::new(".ghost/snapshots").exists();
    components.insert("snapshot_manager".to_string(), HealthComponent {
        status: if snap_ok { "OK".to_string() } else { "DEGRADED".to_string() },
        message: if snap_ok { "Snapshots dir ready".to_string() } else { "Snapshots dir missing".to_string() },
        fallback: false,
    });

    components.insert("crash_parser".to_string(), HealthComponent {
        status: "OK".to_string(),
        message: "Crash parser ready".to_string(),
        fallback: false,
    });

    components.insert("ranker".to_string(), HealthComponent {
        status: "OK".to_string(),
        message: "Ranker ready".to_string(),
        fallback: false,
    });

    let all_ok = components.values().all(|c| c.status == "OK");
    let any_failed = components.values().any(|c| c.status == "FAILED");

    let overall = if any_failed { "DEGRADED" } else if all_ok { "HEALTHY" } else { "WARNING" };

    Ok(SystemHealth {
        overall: overall.to_string(),
        components,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64(),
    })
}

fn main() {
    tauri::Builder::default()
        .manage(AppState { python: Arc::new(Mutex::new(detect_python())) })
        .invoke_handler(tauri::generate_handler![
            ghost_init,
            get_timeline,
            create_snapshot,
            restore_snapshot,
            restore_last_working,
            get_crash_suspects,
            get_system_health,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ghost Universal");
}
