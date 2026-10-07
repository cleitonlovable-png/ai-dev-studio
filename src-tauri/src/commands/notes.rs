use crate::database::{DbState, Note};
use chrono::Utc;
use rusqlite::params;
use tauri::State;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    pub project_id: i64,
    pub title: String,
    pub content: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteInput {
    pub id: i64,
    pub title: String,
    pub content: String,
}

const SELECT_NOTE_COLUMNS: &str = "id, project_id, title, content, created_at, updated_at";

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        title: row.get("title")?,
        content: row.get("content")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

#[tauri::command]
pub fn list_notes(state: State<DbState>, project_id: i64) -> Result<Vec<Note>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "SELECT {SELECT_NOTE_COLUMNS} FROM notes WHERE project_id = ?1 ORDER BY updated_at DESC"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], row_to_note)
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command]
pub fn create_note(state: State<DbState>, input: CreateNoteInput) -> Result<Note, String> {
    if input.title.trim().is_empty() {
        return Err("O título da nota não pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO notes (project_id, title, content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![input.project_id, input.title.trim(), input.content, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let sql = format!("SELECT {SELECT_NOTE_COLUMNS} FROM notes WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_note)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note(state: State<DbState>, input: UpdateNoteInput) -> Result<Note, String> {
    if input.title.trim().is_empty() {
        return Err("O título da nota não pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        params![input.title.trim(), input.content, now, input.id],
    )
    .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_NOTE_COLUMNS} FROM notes WHERE id = ?1");
    conn.query_row(&sql, params![input.id], row_to_note)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_note(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
