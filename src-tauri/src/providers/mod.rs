use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderId {
    Codex,
    Claude,
    Ollama,
}

impl ProviderId {
    pub fn command_name(&self) -> &'static str {
        match self {
            ProviderId::Codex => "codex",
            ProviderId::Claude => "claude",
            ProviderId::Ollama => "ollama",
        }
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatus {
    pub id: ProviderId,
    pub label: String,
    pub available: bool,
    pub version: Option<String>,
    /// Somente preenchido para o Ollama: modelos instalados localmente.
    pub models: Option<Vec<String>>,
    /// Explica de onde veio a deteccao (CLI encontrada no PATH, servidor
    /// HTTP local respondendo, ou nenhum dos dois). Ajuda o usuario a
    /// entender um "Nao verificado" que na real e so uma CLI faltando.
    pub detection_note: Option<String>,
}

/// Roda `<comando> --version`. Primeiro tenta execucao direta (funciona
/// para .exe/.cmd/.bat, que e como a maioria das ferramentas globais do
/// npm se instala no Windows). Se isso falhar, tenta de novo delegando
/// para o PowerShell — necessario quando a ferramenta foi instalada como
/// um script `.ps1` puro (sem wrapper .cmd), caso em que o Windows nao
/// sabe executar o arquivo diretamente via CreateProcess, mas o
/// PowerShell sabe resolver e rodar normalmente.
fn run_version_check(command: &str) -> Option<String> {
    let mut direct = Command::new(command);
    direct.arg("--version");
    if let Some(v) = try_run(&mut direct) {
        return Some(v);
    }

    #[cfg(target_os = "windows")]
    {
        let mut via_powershell = Command::new("powershell.exe");
        via_powershell.args(["-NoProfile", "-Command", &format!("{command} --version")]);
        if let Some(v) = try_run(&mut via_powershell) {
            return Some(v);
        }
    }

    None
}

fn try_run(cmd: &mut Command) -> Option<String> {
    let output = cmd.output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let first_line = text.lines().next().unwrap_or("").trim();
    if first_line.is_empty() {
        None
    } else {
        Some(first_line.to_string())
    }
}

pub fn detect_codex() -> ProviderStatus {
    let version = run_version_check("codex");
    ProviderStatus {
        id: ProviderId::Codex,
        label: "Codex".into(),
        available: version.is_some(),
        version,
        models: None,
        detection_note: None,
    }
}

pub fn detect_claude() -> ProviderStatus {
    let version = run_version_check("claude");
    ProviderStatus {
        id: ProviderId::Claude,
        label: "Claude Code".into(),
        available: version.is_some(),
        version,
        models: None,
        detection_note: None,
    }
}

/// O Ollama pode estar disponivel de duas formas independentes: o binario
/// `ollama` no PATH (para conseguirmos rodar `ollama run <cwd>` no
/// terminal), e/ou o servidor HTTP local em 127.0.0.1:11434 (para listar
/// modelos sem precisar rodar um processo). Tratamos qualquer um dos dois
/// como "disponivel", mas explicamos qual foi encontrado.
pub fn detect_ollama() -> ProviderStatus {
    let cli_version = run_version_check("ollama");
    let http_models = fetch_ollama_models();

    let available = cli_version.is_some() || http_models.is_some();

    let detection_note = match (&cli_version, &http_models) {
        (Some(_), Some(_)) => Some("CLI e servidor local detectados".to_string()),
        (Some(_), None) => Some("CLI encontrada, mas o servidor local nao respondeu".to_string()),
        (None, Some(_)) => Some("Servidor local respondeu (CLI nao encontrada no PATH)".to_string()),
        (None, None) => None,
    };

    ProviderStatus {
        id: ProviderId::Ollama,
        label: "Ollama (Local)".into(),
        available,
        version: cli_version,
        models: http_models,
        detection_note,
    }
}

#[derive(serde::Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(serde::Deserialize)]
struct OllamaModel {
    name: String,
}

fn fetch_ollama_models() -> Option<Vec<String>> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_millis(800))
        .build();

    let response = agent
        .get("http://127.0.0.1:11434/api/tags")
        .call()
        .ok()?;

    let parsed: OllamaTagsResponse = response.into_json().ok()?;
    Some(parsed.models.into_iter().map(|m| m.name).collect())
}

pub fn detect_all() -> Vec<ProviderStatus> {
    vec![detect_codex(), detect_claude(), detect_ollama()]
}
