use crate::database::{DbState, ProjectCheck};
use crate::events::{self, AppEvent};
use crate::quality::{self, DetectedCheck};
use chrono::Utc;
use rusqlite::params;
use std::fs;
use tauri::{AppHandle, Manager, State};

const SELECT_CHECK_COLUMNS: &str =
    "id, project_id, type, tool, command, started_at, finished_at, status, exit_code, summary, output_path";

fn row_to_check(row: &rusqlite::Row) -> rusqlite::Result<ProjectCheck> {
    Ok(ProjectCheck {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        check_type: row.get("type")?,
        tool: row.get("tool")?,
        command: row.get("command")?,
        started_at: row.get("started_at")?,
        finished_at: row.get("finished_at")?,
        status: row.get("status")?,
        exit_code: row.get("exit_code")?,
        summary: row.get("summary")?,
        output_path: row.get("output_path")?,
    })
}

#[tauri::command]
pub fn detect_project_checks(state: State<DbState>, project_id: i64) -> Result<Vec<DetectedCheck>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let path: String = conn
        .query_row("SELECT path FROM projects WHERE id = ?1", params![project_id], |r| r.get(0))
        .map_err(|_| "Projeto não encontrado.".to_string())?;
    Ok(quality::detect_checks(&path))
}

fn save_log(app: &AppHandle, project_id: i64, content: &str) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("não foi possível resolver o diretório de dados do app: {e}"))?;
    let dir = app_data_dir.join("check-logs").join(format!("project_{project_id}"));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.log", uuid::Uuid::new_v4()));
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunCheckInput {
    pub project_id: i64,
    #[serde(rename = "type")]
    pub check_type: String,
    pub tool: String,
    pub command: String,
}

#[tauri::command]
pub fn run_project_check(app: AppHandle, state: State<DbState>, input: RunCheckInput) -> Result<ProjectCheck, String> {
    let project_path: String = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT path FROM projects WHERE id = ?1",
            params![input.project_id],
            |r| r.get(0),
        )
        .map_err(|_| "Projeto não encontrado.".to_string())?
    };

    let started_at = Utc::now().to_rfc3339();
    let result = quality::run_command(&project_path, &input.command);
    let finished_at = Utc::now().to_rfc3339();

    let output_path = save_log(&app, input.project_id, &result.output).ok();

    // guarda so as ultimas ~3000 chars da saida como resumo rapido; o log
    // completo fica no arquivo (output_path)
    let summary = if result.output.len() > 3000 {
        result.output[result.output.len() - 3000..].to_string()
    } else {
        result.output.clone()
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO project_checks (project_id, type, tool, command, started_at, finished_at, status, exit_code, summary, output_path)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            input.project_id,
            input.check_type,
            input.tool,
            input.command,
            started_at,
            finished_at,
            result.status,
            result.exit_code,
            summary,
            output_path
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    drop(conn);

    if input.check_type == "build" {
        events::emit(
            &app,
            AppEvent::BuildFinished {
                project_id: input.project_id,
                status: result.status.clone(),
            },
        );
    } else if input.check_type == "test" {
        events::emit(
            &app,
            AppEvent::TestFinished {
                project_id: input.project_id,
                status: result.status.clone(),
            },
        );
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {SELECT_CHECK_COLUMNS} FROM project_checks WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_check)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_check_history(state: State<DbState>, project_id: i64) -> Result<Vec<ProjectCheck>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql =
        format!("SELECT {SELECT_CHECK_COLUMNS} FROM project_checks WHERE project_id = ?1 ORDER BY started_at DESC");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], row_to_check)
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for r in rows {
        items.push(r.map_err(|e| e.to_string())?);
    }
    Ok(items)
}
