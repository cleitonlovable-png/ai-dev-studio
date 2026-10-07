use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub mod migrations;

/// Estado global compartilhado do banco, injetado no Tauri via `manage()`.
pub struct DbState(pub Mutex<Connection>);

/// Espelha o tipo `Project` do frontend (src/types/project.ts).
/// Mantenha os dois em sincronia manualmente por enquanto (Fase 1).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub name: String,
    /// `None` enquanto o projeto esta na fase de ideia/planejamento,
    /// ainda sem pasta local vinculada (ver `commands::projects::link_project_folder`).
    pub path: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub stack: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_opened_at: Option<String>,
    pub default_ai_provider: Option<String>,
}

/// Espelha o tipo `Task` do frontend (src/types/task.ts).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub priority: String, // low | medium | high
    pub status: String,   // pending | in_progress | done
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Espelha o tipo `Memory` do frontend (src/types/memory.ts).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Memory {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub content: String,
    pub category: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Espelha o tipo `AiSession` do frontend (src/types/session.ts).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiSession {
    pub id: i64,
    pub project_id: i64,
    pub provider: String,
    pub model: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub summary: Option<String>,
    pub next_step: Option<String>,
    pub status: String,
}

/// Espelha `Backup` do frontend (src/types/backup.ts).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Backup {
    pub id: i64,
    pub project_id: i64,
    #[serde(rename = "type")]
    pub backup_type: String, // manual | automatic | snapshot | before_ai_session
    pub reason: Option<String>,
    pub path: String,
    pub size_bytes: i64,
    pub status: String, // pass | fail | running
    pub provider: Option<String>,
    pub branch: Option<String>,
    pub git_status: Option<String>,
    pub file_count: i64,
    pub created_at: String,
}

/// Espelha `BackupSettings` do frontend (src/types/backup.ts).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupSettings {
    pub project_id: i64,
    pub enabled: bool,
    pub before_ai_session: bool,
    pub retention_value: i64,
    pub destination: String,
    pub exclude_patterns: Vec<String>,
}

/// Um "finding" individual dentro de um relatorio do SecureScan.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecurityFinding {
    pub id: i64,
    pub project_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub severity: String,
    pub remediation: Option<String>,
    pub endpoint_or_file: Option<String>,
    pub plugin_name: Option<String>,
    pub status: String, // open | reviewing | false_positive | resolved | accepted_risk
    pub resolved_at: Option<String>,
    pub external_reference: Option<String>,
}

pub const SELECT_FINDING_COLUMNS: &str = "id, project_id, title, description, category, severity, remediation, endpoint_or_file, plugin_name, status, resolved_at, external_reference";

pub fn row_to_finding(row: &rusqlite::Row) -> rusqlite::Result<SecurityFinding> {
    Ok(SecurityFinding {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        category: row.get("category")?,
        severity: row.get("severity")?,
        remediation: row.get("remediation")?,
        endpoint_or_file: row.get("endpoint_or_file")?,
        plugin_name: row.get("plugin_name")?,
        status: row.get("status")?,
        resolved_at: row.get("resolved_at")?,
        external_reference: row.get("external_reference")?,
    })
}

/// Um relatorio de scan recebido via webhook do SecureScan, com seus findings.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecurityReport {
    pub id: i64,
    pub scan_id: String,
    pub project_name: String,
    pub domain: Option<String>,
    pub scan_type: String,
    pub status: String,
    pub severity_critical: i64,
    pub severity_high: i64,
    pub severity_medium: i64,
    pub severity_low: i64,
    pub severity_info: i64,
    pub received_at: String,
    pub project_id: Option<i64>,
    pub findings: Vec<SecurityFinding>,
}

/// Espelha `ProjectCheck` do frontend (src/types/qualityCheck.ts).
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectCheck {
    pub id: i64,
    pub project_id: i64,
    #[serde(rename = "type")]
    pub check_type: String, // build | lint | test
    pub tool: Option<String>,
    pub command: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub status: String, // pass | warning | fail | running
    pub exit_code: Option<i32>,
    pub summary: Option<String>,
    pub output_path: Option<String>,
}

/// Uma linha da Timeline do projeto (src/types/timelineEvent.ts).
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectEvent {
    pub id: i64,
    pub project_id: i64,
    pub event_type: String,
    pub payload: Option<String>, // JSON livre, o frontend faz o parse
    pub created_at: String,
}

/// Uma nota livre do projeto (src/types/note.ts). Diferente da Memoria
/// (que e estruturada por categoria, pensada para dar contexto a IA), a
/// Nota e um bloco de texto livre do usuario — lembretes, rascunhos, etc.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Um fluxograma/mapa mental do projeto (src/types/diagram.ts). Guardado
/// como fonte de texto em sintaxe Mermaid — o frontend renderiza.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Diagram {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub mermaid_source: String,
    pub created_at: String,
    pub updated_at: String,
}

/// O design system do projeto (src/types/designSystem.ts): paleta de
/// cores e tipografia, guardadas como JSON livre — o backend so persiste
/// a string, a estrutura e responsabilidade do frontend.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesignSystem {
    pub id: i64,
    pub project_id: i64,
    pub colors_json: String,
    pub typography_json: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Abre (ou cria) o arquivo `aidevstudio.db` dentro do diretorio de dados
/// do app e garante que todas as migracoes tenham sido aplicadas.
pub fn init_connection(db_path: &std::path::Path) -> rusqlite::Result<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    migrations::run_migrations(&conn)?;

    Ok(conn)
}
