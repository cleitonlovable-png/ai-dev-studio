use crate::database::{DbState, ProjectEvent};
use rusqlite::params;
use tauri::State;

#[tauri::command(async)]
pub fn list_project_events(state: State<DbState>, project_id: i64) -> Result<Vec<ProjectEvent>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, event_type, payload, created_at
             FROM project_events WHERE project_id = ?1
             ORDER BY created_at DESC LIMIT 200",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectEvent {
                id: row.get(0)?,
                project_id: row.get(1)?,
                event_type: row.get(2)?,
                payload: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for r in rows {
        items.push(r.map_err(|e| e.to_string())?);
    }
    Ok(items)
}
