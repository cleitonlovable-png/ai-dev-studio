use crate::database::{DbState, Project};
use crate::events::{self, AppEvent};
use crate::filesystem;
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use tauri::{AppHandle, State};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
}

fn row_to_project(row: &rusqlite::Row) -> rusqlite::Result<Project> {
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
}

#[tauri::command]
pub fn list_projects(state: State<DbState>) -> Result<Vec<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, path, description, status, stack, created_at,
                    updated_at, last_opened_at, default_ai_provider
             FROM projects
             WHERE status != 'archived'
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], row_to_project)
        .map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(|e| e.to_string())?);
    }
    Ok(projects)
}

#[tauri::command]
pub fn create_project(
    state: State<DbState>,
    input: CreateProjectInput,
) -> Result<Project, String> {
    let name = input.name.trim();
    let path = input.path.trim();

    if name.is_empty() {
        return Err("O nome do projeto nao pode ser vazio.".into());
    }
    if path.is_empty() {
        return Err("A pasta do projeto nao pode ser vazia.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Evita cadastrar a mesma pasta duas vezes (a coluna 'path' e UNIQUE,
    // mas checar antes da o erro em portugues em vez do erro cru do SQLite).
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM projects WHERE path = ?1",
            params![path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Err("Ja existe um projeto cadastrado com essa pasta.".into());
    }

    let now = Utc::now().to_rfc3339();
    let stack = filesystem::detect_stack(path);

    conn.execute(
        "INSERT INTO projects (name, path, description, status, stack, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?5)",
        params![name, path, input.description, stack, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    conn.query_row(
        "SELECT id, name, path, description, status, stack, created_at,
                updated_at, last_opened_at, default_ai_provider
         FROM projects WHERE id = ?1",
        params![id],
        row_to_project,
    )
    .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectFromScratchInput {
    pub name: String,
    pub description: Option<String>,
}

/// Cria um projeto "do zero": so nome e descricao, sem pasta local
/// vinculada ainda. O projeto entra na fase de ideia/planejamento —
/// abas que dependem de filesystem (Terminal, Git, Arquivos, Backups,
/// Qualidade) ficam indisponiveis no frontend até uma pasta ser
/// vinculada via `link_project_folder`.
#[tauri::command]
pub fn create_project_from_scratch(
    state: State<DbState>,
    input: CreateProjectFromScratchInput,
) -> Result<Project, String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("O nome do projeto não pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO projects (name, path, description, status, stack, created_at, updated_at)
         VALUES (?1, NULL, ?2, 'active', NULL, ?3, ?3)",
        params![name, input.description, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    conn.query_row(
        "SELECT id, name, path, description, status, stack, created_at,
                updated_at, last_opened_at, default_ai_provider
         FROM projects WHERE id = ?1",
        params![id],
        row_to_project,
    )
    .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkProjectFolderInput {
    pub project_id: i64,
    pub path: String,
}

/// "Promove" um projeto que nasceu como ideia (sem pasta) para um
/// projeto completo, vinculando uma pasta local existente. A partir
/// daqui, Terminal/Git/Arquivos/Backups/Qualidade passam a funcionar
/// normalmente. Detecta a stack na hora, igual ao fluxo de abrir um
/// projeto existente.
#[tauri::command]
pub fn link_project_folder(
    state: State<DbState>,
    input: LinkProjectFolderInput,
) -> Result<Project, String> {
    let path = input.path.trim();
    if path.is_empty() {
        return Err("A pasta não pode ser vazia.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM projects WHERE path = ?1",
            params![path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if existing.is_some() {
        return Err("Já existe um projeto cadastrado com essa pasta.".into());
    }

    let now = Utc::now().to_rfc3339();
    let stack = filesystem::detect_stack(path);

    conn.execute(
        "UPDATE projects SET path = ?1, stack = ?2, updated_at = ?3 WHERE id = ?4",
        params![path, stack, now, input.project_id],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, path, description, status, stack, created_at,
                updated_at, last_opened_at, default_ai_provider
         FROM projects WHERE id = ?1",
        params![input.project_id],
        row_to_project,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn touch_project_opened(app: AppHandle, state: State<DbState>, project_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE projects SET last_opened_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![now, project_id],
    )
    .map_err(|e| e.to_string())?;
    drop(conn);
    events::emit(&app, AppEvent::ProjectOpened { project_id });
    Ok(())
}

/// Move o projeto para o status "archived". Nao apaga nada do banco nem
/// do disco — so tira da lista principal (list_projects filtra archived).
#[tauri::command]
pub fn archive_project(state: State<DbState>, project_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE projects SET status = 'archived', updated_at = ?1 WHERE id = ?2",
        params![now, project_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub default_ai_provider: Option<String>,
}

/// Edita os campos editáveis do projeto. O caminho (`path`) nunca é
/// editável por aqui — mudar a pasta de um projeto é uma operação
/// diferente (e perigosa) que não faz parte deste comando.
#[tauri::command]
pub fn update_project(state: State<DbState>, input: UpdateProjectInput) -> Result<Project, String> {
    if input.name.trim().is_empty() {
        return Err("O nome do projeto não pode ser vazio.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE projects SET name = ?1, description = ?2, status = ?3, default_ai_provider = ?4, updated_at = ?5 WHERE id = ?6",
        params![
            input.name.trim(),
            input.description,
            input.status,
            input.default_ai_provider,
            now,
            input.id
        ],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, path, description, status, stack, created_at,
                updated_at, last_opened_at, default_ai_provider
         FROM projects WHERE id = ?1",
        params![input.id],
        row_to_project,
    )
    .map_err(|e| e.to_string())
}

/// Remove o registro do projeto do AI Dev Studio. IMPORTANTE: isso NUNCA
/// mexe na pasta/arquivos do projeto no disco — apenas apaga as linhas do
/// banco de dados. Como o banco roda com `foreign_keys = ON`, precisamos
/// apagar manualmente TODAS as tabelas que referenciam este projeto antes
/// de apagar a linha de `projects` — senao o SQLite recusa o delete por
/// violacao de chave estrangeira (isso ficava falhando em silencio antes).
#[tauri::command]
pub fn delete_project(state: State<DbState>, project_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Ordem nao importa entre si, mas todas precisam vir antes de
    // "projects" por causa da FK.
    let child_tables = [
        "tasks",
        "project_memories",
        "ai_sessions",
        "backups",
        "backup_settings",
        "project_checks",
        "security_findings",
        "notes",
        "project_events",
        "diagrams",
        "design_systems",
    ];
    for table in child_tables {
        let sql = format!("DELETE FROM {table} WHERE project_id = ?1");
        conn.execute(&sql, params![project_id]).map_err(|e| e.to_string())?;
    }
    // security_reports tem project_id opcional (NULL para relatorios do
    // webhook do SecureScan) — so apaga os que pertencem a este projeto.
    conn.execute(
        "DELETE FROM security_reports WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM projects WHERE id = ?1", params![project_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
