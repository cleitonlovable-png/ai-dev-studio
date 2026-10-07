use crate::terminal::{self, ShellInfo, ShellKind, TerminalRegistry};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn list_shells() -> Vec<ShellInfo> {
    terminal::detect_shells()
}

#[tauri::command]
pub fn create_terminal(
    app: AppHandle,
    registry: State<Arc<TerminalRegistry>>,
    project_path: String,
    shell: ShellKind,
) -> Result<String, String> {
    terminal::spawn_shell(app, registry.inner().clone(), &project_path, shell)
}

#[tauri::command]
pub fn write_terminal(
    registry: State<Arc<TerminalRegistry>>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    terminal::write(&registry, &session_id, &data)
}

#[tauri::command]
pub fn resize_terminal(
    registry: State<Arc<TerminalRegistry>>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    terminal::resize(&registry, &session_id, rows, cols)
}

#[tauri::command]
pub fn close_terminal(registry: State<Arc<TerminalRegistry>>, session_id: String) -> Result<(), String> {
    terminal::close(&registry, &session_id)
}
