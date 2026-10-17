use crate::database::{AiSession, DbState};
use crate::events::{self, AppEvent};
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use tauri::{AppHandle, State};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionInput {
    pub project_id: i64,
    pub provider: String,
    pub model: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishSessionInput {
    pub id: i64,
    pub summary: Option<String>,
    pub next_step: Option<String>,
}

const SELECT_SESSION_COLUMNS: &str =
    "id, project_id, provider, model, started_at, ended_at, summary, next_step, status";

fn row_to_session(row: &rusqlite::Row) -> rusqlite::Result<AiSession> {
    Ok(AiSession {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        provider: row.get("provider")?,
        model: row.get("model")?,
        started_at: row.get("started_at")?,
        ended_at: row.get("ended_at")?,
        summary: row.get("summary")?,
        next_step: row.get("next_step")?,
        status: row.get("status")?,
    })
}

#[tauri::command(async)]
pub fn list_sessions(state: State<DbState>, project_id: i64) -> Result<Vec<AiSession>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql =
        format!("SELECT {SELECT_SESSION_COLUMNS} FROM ai_sessions WHERE project_id = ?1 ORDER BY started_at DESC");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], row_to_session)
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command(async)]
pub fn get_last_session(state: State<DbState>, project_id: i64) -> Result<Option<AiSession>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "SELECT {SELECT_SESSION_COLUMNS} FROM ai_sessions
         WHERE project_id = ?1 AND status = 'finished'
         ORDER BY ended_at DESC LIMIT 1"
    );
    conn.query_row(&sql, params![project_id], row_to_session)
        .optional()
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn start_session(app: AppHandle, state: State<DbState>, input: StartSessionInput) -> Result<AiSession, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO ai_sessions (project_id, provider, model, started_at, status)
         VALUES (?1, ?2, ?3, ?4, 'running')",
        params![input.project_id, input.provider, input.model, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let sql = format!("SELECT {SELECT_SESSION_COLUMNS} FROM ai_sessions WHERE id = ?1");
    let session = conn
        .query_row(&sql, params![id], row_to_session)
        .map_err(|e| e.to_string())?;

    events::emit(
        &app,
        AppEvent::AiSessionStarted {
            project_id: input.project_id,
            provider: input.provider,
        },
    );

    Ok(session)
}

#[tauri::command(async)]
pub fn finish_session(app: AppHandle, state: State<DbState>, input: FinishSessionInput) -> Result<AiSession, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE ai_sessions SET ended_at = ?1, summary = ?2, next_step = ?3, status = 'finished' WHERE id = ?4",
        params![now, input.summary, input.next_step, input.id],
    )
    .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_SESSION_COLUMNS} FROM ai_sessions WHERE id = ?1");
    let session = conn
        .query_row(&sql, params![input.id], row_to_session)
        .map_err(|e| e.to_string())?;

    events::emit(
        &app,
        AppEvent::AiSessionFinished {
            project_id: session.project_id,
            session_id: input.id,
        },
    );

    Ok(session)
}

/// Descarta uma sessao sem preencher resumo (ex: usuario fechou o
/// terminal sem querer registrar nada). Marca como finalizada mesmo
/// assim, so que sem summary/next_step, para nao ficar "running" para
/// sempre no historico.
#[tauri::command(async)]
pub fn discard_session(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE ai_sessions SET ended_at = ?1, status = 'finished' WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
