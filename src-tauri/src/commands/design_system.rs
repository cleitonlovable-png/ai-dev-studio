use crate::database::{DbState, DesignSystem};
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use tauri::State;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDesignSystemInput {
    pub project_id: i64,
    /// JSON serializado pelo frontend (lista de {name, hex}). O backend
    /// so guarda a string — nao valida a estrutura.
    pub colors_json: String,
    /// JSON serializado pelo frontend (lista de {name, fontFamily, size, weight}).
    pub typography_json: String,
}

const SELECT_DS_COLUMNS: &str =
    "id, project_id, colors_json, typography_json, created_at, updated_at";

fn row_to_design_system(row: &rusqlite::Row) -> rusqlite::Result<DesignSystem> {
    Ok(DesignSystem {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        colors_json: row.get("colors_json")?,
        typography_json: row.get("typography_json")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

/// Busca o design system do projeto. Se ainda nao existir nenhum
/// registro (projeto novo), cria um vazio na hora e retorna — assim o
/// frontend sempre recebe um objeto valido para editar, nunca null.
#[tauri::command]
pub fn get_design_system(state: State<DbState>, project_id: i64) -> Result<DesignSystem, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {SELECT_DS_COLUMNS} FROM design_systems WHERE project_id = ?1");

    let existing = conn
        .query_row(&sql, params![project_id], row_to_design_system)
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(ds) = existing {
        return Ok(ds);
    }

    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO design_systems (project_id, colors_json, typography_json, created_at, updated_at)
         VALUES (?1, '[]', '[]', ?2, ?2)",
        params![project_id, now],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&sql, params![project_id], row_to_design_system)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_design_system(
    state: State<DbState>,
    input: UpdateDesignSystemInput,
) -> Result<DesignSystem, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    // Upsert: a maioria dos projetos ja tera a linha (criada pelo
    // get_design_system na primeira visita a aba), mas isso cobre o
    // caso de ela nao existir ainda por algum motivo.
    conn.execute(
        "INSERT INTO design_systems (project_id, colors_json, typography_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)
         ON CONFLICT(project_id) DO UPDATE SET
            colors_json = excluded.colors_json,
            typography_json = excluded.typography_json,
            updated_at = excluded.updated_at",
        params![input.project_id, input.colors_json, input.typography_json, now],
    )
    .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_DS_COLUMNS} FROM design_systems WHERE project_id = ?1");
    conn.query_row(&sql, params![input.project_id], row_to_design_system)
        .map_err(|e| e.to_string())
}
