use crate::database::{DbState, Diagram};
use chrono::Utc;
use rusqlite::params;
use tauri::State;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDiagramInput {
    pub project_id: i64,
    pub title: String,
    pub mermaid_source: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDiagramInput {
    pub id: i64,
    pub title: String,
    pub mermaid_source: String,
}

const SELECT_DIAGRAM_COLUMNS: &str =
    "id, project_id, title, mermaid_source, created_at, updated_at";

fn row_to_diagram(row: &rusqlite::Row) -> rusqlite::Result<Diagram> {
    Ok(Diagram {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        title: row.get("title")?,
        mermaid_source: row.get("mermaid_source")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

#[tauri::command(async)]
pub fn list_diagrams(state: State<DbState>, project_id: i64) -> Result<Vec<Diagram>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "SELECT {SELECT_DIAGRAM_COLUMNS} FROM diagrams WHERE project_id = ?1 ORDER BY updated_at DESC"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], row_to_diagram)
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

const DEFAULT_MERMAID_SOURCE: &str = "flowchart TD\n    A[Início] --> B[Próximo passo]\n";

#[tauri::command(async)]
pub fn create_diagram(state: State<DbState>, input: CreateDiagramInput) -> Result<Diagram, String> {
    if input.title.trim().is_empty() {
        return Err("O título do diagrama não pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let source = if input.mermaid_source.trim().is_empty() {
        DEFAULT_MERMAID_SOURCE.to_string()
    } else {
        input.mermaid_source
    };

    conn.execute(
        "INSERT INTO diagrams (project_id, title, mermaid_source, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![input.project_id, input.title.trim(), source, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let sql = format!("SELECT {SELECT_DIAGRAM_COLUMNS} FROM diagrams WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_diagram)
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn update_diagram(state: State<DbState>, input: UpdateDiagramInput) -> Result<Diagram, String> {
    if input.title.trim().is_empty() {
        return Err("O título do diagrama não pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE diagrams SET title = ?1, mermaid_source = ?2, updated_at = ?3 WHERE id = ?4",
        params![input.title.trim(), input.mermaid_source, now, input.id],
    )
    .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_DIAGRAM_COLUMNS} FROM diagrams WHERE id = ?1");
    conn.query_row(&sql, params![input.id], row_to_diagram)
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn delete_diagram(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM diagrams WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
