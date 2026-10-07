use crate::database::DbState;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

/// Eventos internos do AI Dev Studio. Qualquer modulo (backup, IA,
/// quality, security...) emite um destes em vez de se comunicar
/// diretamente com outro modulo. Cada evento vira uma linha em
/// `project_events` (fonte da aba Timeline) E e mandado ao vivo para o
/// frontend no mesmo canal.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "payload")]
#[serde(rename_all_fields = "camelCase")]
#[allow(dead_code)] // nem toda variante tem um chamador ainda (reservado)
pub enum AppEvent {
    ProjectOpened {
        project_id: i64,
    },
    BackupCreated {
        project_id: i64,
        backup_id: i64,
        reason: String,
    },
    BackupRestored {
        project_id: i64,
        backup_id: i64,
    },
    AiSessionStarted {
        project_id: i64,
        provider: String,
    },
    AiSessionFinished {
        project_id: i64,
        session_id: i64,
    },
    FileChanged {
        project_id: i64,
        path: String,
    },
    GitStatusChanged {
        project_id: i64,
    },
    BuildFinished {
        project_id: i64,
        status: String,
    },
    TestFinished {
        project_id: i64,
        status: String,
    },
    SecurityScanFinished {
        project_id: i64,
        scanner: String,
        findings: u32,
    },
    FindingCreated {
        project_id: i64,
        finding_id: i64,
        severity: String,
    },
}

impl AppEvent {
    fn project_id(&self) -> i64 {
        match self {
            AppEvent::ProjectOpened { project_id }
            | AppEvent::BackupCreated { project_id, .. }
            | AppEvent::BackupRestored { project_id, .. }
            | AppEvent::AiSessionStarted { project_id, .. }
            | AppEvent::AiSessionFinished { project_id, .. }
            | AppEvent::FileChanged { project_id, .. }
            | AppEvent::GitStatusChanged { project_id }
            | AppEvent::BuildFinished { project_id, .. }
            | AppEvent::TestFinished { project_id, .. }
            | AppEvent::SecurityScanFinished { project_id, .. }
            | AppEvent::FindingCreated { project_id, .. } => *project_id,
        }
    }

    fn type_label(&self) -> &'static str {
        match self {
            AppEvent::ProjectOpened { .. } => "PROJECT_OPENED",
            AppEvent::BackupCreated { .. } => "BACKUP_CREATED",
            AppEvent::BackupRestored { .. } => "BACKUP_RESTORED",
            AppEvent::AiSessionStarted { .. } => "AI_SESSION_STARTED",
            AppEvent::AiSessionFinished { .. } => "AI_SESSION_FINISHED",
            AppEvent::FileChanged { .. } => "FILE_CHANGED",
            AppEvent::GitStatusChanged { .. } => "GIT_STATUS_CHANGED",
            AppEvent::BuildFinished { .. } => "BUILD_FINISHED",
            AppEvent::TestFinished { .. } => "TEST_FINISHED",
            AppEvent::SecurityScanFinished { .. } => "SECURITY_SCAN_FINISHED",
            AppEvent::FindingCreated { .. } => "FINDING_CREATED",
        }
    }
}

/// Nome do canal Tauri usado para todos os eventos (a Timeline tambem
/// pode escutar aqui futuramente para atualizar ao vivo).
pub const EVENT_CHANNEL: &str = "app://event";

/// Registra o evento na Timeline do projeto (tabela `project_events`) e
/// manda ao vivo para o frontend. Se o banco ainda nao estiver
/// disponivel por algum motivo, so pula a persistencia (nao quebra o
/// fluxo principal que chamou `emit`).
pub fn emit(app: &AppHandle, event: AppEvent) {
    let project_id = event.project_id();
    let type_label = event.type_label();

    let payload_json = serde_json::to_value(&event)
        .ok()
        .and_then(|v| v.get("payload").cloned())
        .map(|p| p.to_string());

    if let Some(state) = app.try_state::<DbState>() {
        if let Ok(conn) = state.0.lock() {
            let now = chrono::Utc::now().to_rfc3339();
            let _ = conn.execute(
                "INSERT INTO project_events (project_id, event_type, payload, created_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![project_id, type_label, payload_json, now],
            );
        }
    }

    if let Err(err) = app.emit(EVENT_CHANNEL, &event) {
        eprintln!("[events] falha ao emitir {:?}: {err}", event);
    }
}
