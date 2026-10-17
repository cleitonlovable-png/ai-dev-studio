use crate::database::{DbState, Project};
use crate::filesystem::{self, RecentFile};
use rusqlite::params;
use tauri::State;

#[tauri::command(async)]
pub fn get_recent_files(project_path: String, limit: Option<usize>) -> Vec<RecentFile> {
    filesystem::list_recent_files(&project_path, limit.unwrap_or(10))
}

#[tauri::command(async)]
pub fn count_project_files(project_path: String) -> usize {
    filesystem::count_files(&project_path)
}

/// Roda a deteccao de stack de novo para um projeto ja cadastrado e
/// atualiza a coluna `stack`. Util quando o usuario adiciona um
/// `package.json` depois de ja ter cadastrado a pasta, por exemplo.
#[tauri::command(async)]
pub fn refresh_project_stack(state: State<DbState>, project_id: i64) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let path: String = conn
        .query_row(
            "SELECT path FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let stack = filesystem::detect_stack(&path);
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE projects SET stack = ?1, updated_at = ?2 WHERE id = ?3",
        params![stack, now, project_id],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, path, description, status, stack, created_at,
                updated_at, last_opened_at, default_ai_provider
         FROM projects WHERE id = ?1",
        params![project_id],
        |row| {
            Ok(Project {
                id: row.get("id")?,
                name: row.get("name")?,
                path: row.get("path")?,
                description: row.get("description")?,
                status: row.get("status")?,
                stack: row.get("stack")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
                last_opened_at: row.get("last_opened_at")?,
                default_ai_provider: row.get("default_ai_provider")?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
