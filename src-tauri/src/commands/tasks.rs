use crate::database::{DbState, Task};
use chrono::Utc;
use rusqlite::params;
use tauri::State;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub project_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub due_date: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub due_date: Option<String>,
}

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        priority: row.get("priority")?,
        status: row.get("status")?,
        due_date: row.get("due_date")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

const SELECT_TASK_COLUMNS: &str =
    "id, project_id, title, description, priority, status, due_date, created_at, updated_at";

#[tauri::command(async)]
pub fn list_tasks(state: State<DbState>, project_id: i64) -> Result<Vec<Task>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "SELECT {SELECT_TASK_COLUMNS} FROM tasks WHERE project_id = ?1 ORDER BY
         CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
         CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         created_at DESC"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], row_to_task)
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for row in rows {
        tasks.push(row.map_err(|e| e.to_string())?);
    }
    Ok(tasks)
}

#[tauri::command(async)]
pub fn create_task(state: State<DbState>, input: CreateTaskInput) -> Result<Task, String> {
    if input.title.trim().is_empty() {
        return Err("O titulo da tarefa nao pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?6)",
        params![
            input.project_id,
            input.title.trim(),
            input.description,
            input.priority,
            input.due_date,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let sql = format!("SELECT {SELECT_TASK_COLUMNS} FROM tasks WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_task)
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn update_task(state: State<DbState>, input: UpdateTaskInput) -> Result<Task, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tasks SET title = ?1, description = ?2, priority = ?3, status = ?4,
                due_date = ?5, updated_at = ?6 WHERE id = ?7",
        params![
            input.title.trim(),
            input.description,
            input.priority,
            input.status,
            input.due_date,
            now,
            input.id
        ],
    )
    .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_TASK_COLUMNS} FROM tasks WHERE id = ?1");
    conn.query_row(&sql, params![input.id], row_to_task)
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn toggle_task_status(state: State<DbState>, id: i64) -> Result<Task, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let current_status: String = conn
        .query_row("SELECT status FROM tasks WHERE id = ?1", params![id], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    let next_status = if current_status == "done" { "pending" } else { "done" };
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
        params![next_status, now, id],
    )
    .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_TASK_COLUMNS} FROM tasks WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_task)
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn delete_task(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
