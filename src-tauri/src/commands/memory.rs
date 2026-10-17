use crate::database::{DbState, Memory};
use chrono::Utc;
use rusqlite::params;
use tauri::State;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMemoryInput {
    pub project_id: i64,
    pub title: String,
    pub content: String,
    pub category: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMemoryInput {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub category: String,
}

const SELECT_MEMORY_COLUMNS: &str = "id, project_id, title, content, category, created_at, updated_at";

fn row_to_memory(row: &rusqlite::Row) -> rusqlite::Result<Memory> {
    Ok(Memory {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        title: row.get("title")?,
        content: row.get("content")?,
        category: row.get("category")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

#[tauri::command(async)]
pub fn list_memories(state: State<DbState>, project_id: i64) -> Result<Vec<Memory>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "SELECT {SELECT_MEMORY_COLUMNS} FROM project_memories WHERE project_id = ?1 ORDER BY created_at DESC"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], row_to_memory)
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command(async)]
pub fn create_memory(state: State<DbState>, input: CreateMemoryInput) -> Result<Memory, String> {
    if input.title.trim().is_empty() {
        return Err("O título da memória não pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO project_memories (project_id, title, content, category, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![input.project_id, input.title.trim(), input.content, input.category, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let sql = format!("SELECT {SELECT_MEMORY_COLUMNS} FROM project_memories WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_memory)
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn update_memory(state: State<DbState>, input: UpdateMemoryInput) -> Result<Memory, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE project_memories SET title = ?1, content = ?2, category = ?3, updated_at = ?4 WHERE id = ?5",
        params![input.title.trim(), input.content, input.category, now, input.id],
    )
    .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_MEMORY_COLUMNS} FROM project_memories WHERE id = ?1");
    conn.query_row(&sql, params![input.id], row_to_memory)
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn delete_memory(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM project_memories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
