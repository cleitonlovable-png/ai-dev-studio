use crate::backup::{self, BackupProvider, LocalBackupProvider};
use crate::database::{Backup, BackupSettings, DbState};
use crate::events::{self, AppEvent};
use rusqlite::{params, OptionalExtension};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

const SELECT_BACKUP_COLUMNS: &str =
    "id, project_id, type, reason, path, size_bytes, status, provider, branch, git_status, file_count, created_at";

fn row_to_backup(row: &rusqlite::Row) -> rusqlite::Result<Backup> {
    Ok(Backup {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        backup_type: row.get("type")?,
        reason: row.get("reason")?,
        path: row.get("path")?,
        size_bytes: row.get("size_bytes")?,
        status: row.get("status")?,
        provider: row.get("provider")?,
        branch: row.get("branch")?,
        git_status: row.get("git_status")?,
        file_count: row.get("file_count")?,
        created_at: row.get("created_at")?,
    })
}

fn row_to_settings(row: &rusqlite::Row) -> rusqlite::Result<BackupSettings> {
    let exclude_raw: String = row.get("exclude_patterns")?;
    let exclude_patterns: Vec<String> = serde_json::from_str(&exclude_raw).unwrap_or_default();
    Ok(BackupSettings {
        project_id: row.get("project_id")?,
        enabled: row.get::<_, i64>("enabled")? != 0,
        before_ai_session: row.get::<_, i64>("before_ai_session")? != 0,
        retention_value: row.get("retention_value")?,
        destination: row.get("destination")?,
        exclude_patterns,
    })
}

/// Le a configuracao de backup do projeto, criando uma linha padrao na
/// primeira vez (destino = <dados do app>/backups/project_<id>).
fn get_or_create_settings(
    conn: &rusqlite::Connection,
    app: &AppHandle,
    project_id: i64,
) -> Result<BackupSettings, String> {
    let existing = conn
        .query_row(
            "SELECT project_id, enabled, before_ai_session, retention_value, destination, exclude_patterns
             FROM backup_settings WHERE project_id = ?1",
            params![project_id],
            row_to_settings,
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(settings) = existing {
        return Ok(settings);
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("não foi possível resolver o diretório de dados do app: {e}"))?;
    let destination = app_data_dir
        .join("backups")
        .join(format!("project_{project_id}"));
    let destination_str = destination.to_string_lossy().to_string();
    let exclude_json = serde_json::to_string(&backup::default_exclude_patterns()).unwrap_or_default();

    conn.execute(
        "INSERT INTO backup_settings (project_id, enabled, before_ai_session, retention_value, destination, exclude_patterns)
         VALUES (?1, 1, 1, 10, ?2, ?3)",
        params![project_id, destination_str, exclude_json],
    )
    .map_err(|e| e.to_string())?;

    Ok(BackupSettings {
        project_id,
        enabled: true,
        before_ai_session: true,
        retention_value: 10,
        destination: destination_str,
        exclude_patterns: backup::default_exclude_patterns(),
    })
}

#[tauri::command(async)]
pub fn get_backup_settings(app: AppHandle, state: State<DbState>, project_id: i64) -> Result<BackupSettings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    get_or_create_settings(&conn, &app, project_id)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBackupSettingsInput {
    pub project_id: i64,
    pub enabled: bool,
    pub before_ai_session: bool,
    pub retention_value: i64,
}

#[tauri::command(async)]
pub fn update_backup_settings(
    app: AppHandle,
    state: State<DbState>,
    input: UpdateBackupSettingsInput,
) -> Result<BackupSettings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // garante que a linha exista antes de atualizar
    get_or_create_settings(&conn, &app, input.project_id)?;

    conn.execute(
        "UPDATE backup_settings SET enabled = ?1, before_ai_session = ?2, retention_value = ?3 WHERE project_id = ?4",
        params![
            input.enabled as i64,
            input.before_ai_session as i64,
            input.retention_value,
            input.project_id
        ],
    )
    .map_err(|e| e.to_string())?;

    get_or_create_settings(&conn, &app, input.project_id)
}

#[tauri::command(async)]
pub fn list_backups(state: State<DbState>, project_id: i64) -> Result<Vec<Backup>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "SELECT {SELECT_BACKUP_COLUMNS} FROM backups WHERE project_id = ?1 ORDER BY created_at DESC"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], row_to_backup)
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupWithProject {
    #[serde(flatten)]
    pub backup: Backup,
    pub project_name: String,
}

/// Lista os backups mais recentes de TODOS os projetos, mais novos primeiro —
/// usado pela view global "Backup e Sincronização" na barra lateral, que nao
/// tem um projeto selecionado como contexto.
#[tauri::command(async)]
pub fn list_all_backups(state: State<DbState>, limit: i64) -> Result<Vec<BackupWithProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "SELECT {}, p.name AS project_name
         FROM backups b
         JOIN projects p ON p.id = b.project_id
         ORDER BY b.created_at DESC
         LIMIT ?1",
        SELECT_BACKUP_COLUMNS
            .split(", ")
            .map(|c| format!("b.{c}"))
            .collect::<Vec<_>>()
            .join(", ")
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(BackupWithProject {
                backup: row_to_backup(row)?,
                project_name: row.get("project_name")?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBackupInput {
    pub project_id: i64,
    #[serde(rename = "type")]
    pub backup_type: String,
    pub reason: Option<String>,
    pub provider: Option<String>,
}

#[tauri::command(async)]
pub fn create_backup_now(app: AppHandle, state: State<DbState>, input: CreateBackupInput) -> Result<Backup, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let project_path: String = conn
        .query_row(
            "SELECT path FROM projects WHERE id = ?1",
            params![input.project_id],
            |r| r.get(0),
        )
        .map_err(|_| "Projeto não encontrado.".to_string())?;

    let settings = get_or_create_settings(&conn, &app, input.project_id)?;
    if !settings.enabled {
        return Err("Backup está desativado para este projeto (veja Configurações de Backup).".into());
    }

    let git = crate::git::get_status(&project_path);
    let branch = git.branch.clone();
    let git_status_summary = if !git.is_repo {
        None
    } else if git.clean {
        Some("Limpo".to_string())
    } else {
        let total = git.modified.len() + git.added.len() + git.removed.len() + git.untracked.len();
        Some(format!("{total} arquivo(s) alterado(s)"))
    };

    let provider = LocalBackupProvider;
    let result = provider
        .create_backup(
            Path::new(&project_path),
            Path::new(&settings.destination),
            &settings.exclude_patterns,
        )
        .map_err(|e| format!("Falha ao criar backup: {e}"))?;

    let now = chrono::Utc::now().to_rfc3339();
    let path_str = result.path.to_string_lossy().to_string();

    conn.execute(
        "INSERT INTO backups (project_id, type, reason, path, size_bytes, status, provider, branch, git_status, file_count, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pass', ?6, ?7, ?8, ?9, ?10)",
        params![
            input.project_id,
            input.backup_type,
            input.reason,
            path_str,
            result.size_bytes as i64,
            input.provider,
            branch,
            git_status_summary,
            result.file_count as i64,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    apply_retention(&conn, input.project_id, settings.retention_value);
    drop(conn);

    events::emit(
        &app,
        AppEvent::BackupCreated {
            project_id: input.project_id,
            backup_id: id,
            reason: input.reason.clone().unwrap_or_else(|| input.backup_type.clone()),
        },
    );

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {SELECT_BACKUP_COLUMNS} FROM backups WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_backup)
        .map_err(|e| e.to_string())
}

/// Mantem no maximo `keep` backups por projeto, apagando os mais antigos
/// (arquivo E linha do banco). Silencioso em caso de erro de disco
/// individual — nao queremos que uma falha de retencao quebre a criacao
/// do backup que acabou de suceder.
fn apply_retention(conn: &rusqlite::Connection, project_id: i64, keep: i64) {
    if keep <= 0 {
        return;
    }
    let mut stmt = match conn.prepare(
        "SELECT id, path FROM backups WHERE project_id = ?1 ORDER BY created_at DESC",
    ) {
        Ok(s) => s,
        Err(_) => return,
    };

    let rows: Vec<(i64, String)> = stmt
        .query_map(params![project_id], |r| Ok((r.get(0)?, r.get(1)?)))
        .map(|rows| rows.flatten().collect())
        .unwrap_or_default();

    for (id, path) in rows.into_iter().skip(keep as usize) {
        let _ = backup::delete_backup_folder(&PathBuf::from(&path));
        let _ = conn.execute("DELETE FROM backups WHERE id = ?1", params![id]);
    }
}

#[tauri::command(async)]
pub fn restore_backup(app: AppHandle, state: State<DbState>, backup_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let (backup_path, project_id): (String, i64) = conn
        .query_row(
            "SELECT path, project_id FROM backups WHERE id = ?1",
            params![backup_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Backup não encontrado.".to_string())?;

    let project_path: String = conn
        .query_row(
            "SELECT path FROM projects WHERE id = ?1",
            params![project_id],
            |r| r.get(0),
        )
        .map_err(|_| "Projeto não encontrado.".to_string())?;

    let exclude_raw: String = conn
        .query_row(
            "SELECT exclude_patterns FROM backup_settings WHERE project_id = ?1",
            params![project_id],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "[]".to_string());
    let exclude: Vec<String> = serde_json::from_str(&exclude_raw).unwrap_or_default();
    drop(conn);

    let provider = LocalBackupProvider;
    provider
        .restore(Path::new(&backup_path), Path::new(&project_path), &exclude)
        .map_err(|e| format!("Falha ao restaurar: {e}"))?;

    events::emit(&app, AppEvent::BackupRestored { project_id, backup_id });
    Ok(())
}

#[tauri::command(async)]
pub fn delete_backup(state: State<DbState>, backup_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let path: String = conn
        .query_row("SELECT path FROM backups WHERE id = ?1", params![backup_id], |r| {
            r.get(0)
        })
        .map_err(|_| "Backup não encontrado.".to_string())?;

    backup::delete_backup_folder(&PathBuf::from(&path))?;
    conn.execute("DELETE FROM backups WHERE id = ?1", params![backup_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
