use super::RawFinding;
use serde::Deserialize;
use std::time::Duration;

const ZAP_BASE_URL: &str = "http://127.0.0.1:8080";

fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new().timeout(Duration::from_secs(5)).build()
}

/// Verifica se ha um ZAP rodando localmente com a API habilitada (modo
/// daemon padrao). Nunca dispara nenhum scan so de detectar.
pub fn is_available() -> bool {
    agent()
        .get(&format!("{ZAP_BASE_URL}/JSON/core/view/version/"))
        .call()
        .is_ok()
}

pub fn get_version() -> Option<String> {
    #[derive(Deserialize)]
    struct VersionResp {
        version: String,
    }
    agent()
        .get(&format!("{ZAP_BASE_URL}/JSON/core/view/version/"))
        .call()
        .ok()?
        .into_json::<VersionResp>()
        .ok()
        .map(|v| v.version)
}

/// Inicia um Active Scan contra `target_url`. So deve ser chamado depois
/// que o usuario confirmou explicitamente que tem autorizacao para
/// escanear esse alvo — essa funcao em si nao pede confirmacao, quem
/// chama (comando Tauri) e responsavel por isso. Retorna o scan_id do ZAP
/// para consulta de progresso.
pub fn start_active_scan(target_url: &str, api_key: Option<&str>) -> Result<String, String> {
    #[derive(Deserialize)]
    struct ScanResp {
        scan: String,
    }

    let mut url = format!(
        "{ZAP_BASE_URL}/JSON/ascan/action/scan/?url={}",
        urlencoding_simple(target_url)
    );
    if let Some(key) = api_key {
        url.push_str(&format!("&apikey={}", urlencoding_simple(key)));
    }

    let resp: ScanResp = agent()
        .get(&url)
        .call()
        .map_err(|e| format!("falha ao iniciar scan no ZAP: {e}"))?
        .into_json()
        .map_err(|e| format!("resposta inesperada do ZAP: {e}"))?;

    Ok(resp.scan)
}

/// Retorna o progresso (0-100) de um scan em andamento.
pub fn get_scan_progress(scan_id: &str) -> Result<u32, String> {
    #[derive(Deserialize)]
    struct StatusResp {
        status: String,
    }

    let url = format!("{ZAP_BASE_URL}/JSON/ascan/view/status/?scanId={scan_id}");
    let resp: StatusResp = agent()
        .get(&url)
        .call()
        .map_err(|e| format!("falha ao consultar status: {e}"))?
        .into_json()
        .map_err(|e| e.to_string())?;

    resp.status.parse::<u32>().map_err(|_| "resposta inválida do ZAP".to_string())
}

#[derive(Deserialize)]
struct ZapAlert {
    alert: String,
    risk: String,
    description: Option<String>,
    solution: Option<String>,
    url: Option<String>,
    #[serde(rename = "pluginId")]
    plugin_id: Option<String>,
}

#[derive(Deserialize)]
struct AlertsResp {
    alerts: Vec<ZapAlert>,
}

/// Busca os alertas encontrados para o alvo (chamar depois que o scan
/// atingir 100%).
pub fn fetch_alerts(target_url: &str) -> Result<Vec<RawFinding>, String> {
    let url = format!(
        "{ZAP_BASE_URL}/JSON/core/view/alerts/?baseurl={}",
        urlencoding_simple(target_url)
    );
    let resp: AlertsResp = agent()
        .get(&url)
        .call()
        .map_err(|e| format!("falha ao buscar alertas: {e}"))?
        .into_json()
        .map_err(|e| e.to_string())?;

    Ok(resp
        .alerts
        .into_iter()
        .map(|a| RawFinding {
            title: a.alert,
            description: a.description,
            category: Some("web".into()),
            severity: normalize_risk(&a.risk),
            remediation: a.solution,
            endpoint_or_file: a.url,
            plugin_name: a.plugin_id.map(|id| format!("OWASP ZAP (plugin {id})")).or(Some("OWASP ZAP".into())),
        })
        .collect())
}

fn normalize_risk(raw: &str) -> String {
    match raw.to_lowercase().as_str() {
        "high" => "high",
        "medium" => "medium",
        "low" => "low",
        "informational" => "info",
        _ => "info",
    }
    .to_string()
}

/// Encoder de URL bem simples (sem puxar a crate `url`/`percent-encoding`
/// so para isso). Cobre os caracteres mais comuns em URLs/api keys.
fn urlencoding_simple(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
