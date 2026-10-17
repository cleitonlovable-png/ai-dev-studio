use crate::providers::{self, ProviderId, ProviderStatus};
use crate::terminal::{self, TerminalRegistry};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command(async)]
pub fn detect_ai_providers() -> Vec<ProviderStatus> {
    providers::detect_all()
}

/// Inicia o provider de IA dentro da pasta do projeto, reaproveitando a
/// mesma infraestrutura de PTY do terminal (Fase 3). Retorna um session_id
/// que o frontend anexa a um componente de terminal, exatamente como faz
/// com uma sessao de shell comum.
#[tauri::command(async)]
pub fn start_ai_provider(
    app: AppHandle,
    registry: State<Arc<TerminalRegistry>>,
    project_path: String,
    provider: ProviderId,
) -> Result<String, String> {
    let command = provider.command_name();
    terminal::spawn_command(app, registry.inner().clone(), &project_path, command, &[])
}
