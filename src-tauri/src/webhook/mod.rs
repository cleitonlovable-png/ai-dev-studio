use hmac::{Hmac, Mac};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::io::{Cursor, Read};
use tauri::{AppHandle, Emitter, Manager};
use tiny_http::{Method, Response, Server};

use crate::database::DbState;

type HmacSha256 = Hmac<Sha256>;

const WEBHOOK_PATH: &str = "/webhooks/securescan";

#[derive(Deserialize)]
struct SeveritySummary {
    #[serde(default)]
    critical: i64,
    #[serde(default)]
    high: i64,
    #[serde(default)]
    medium: i64,
    #[serde(default)]
    low: i64,
    #[serde(default)]
    info: i64,
}

#[derive(Deserialize)]
struct FindingPayload {
    title: String,
    description: Option<String>,
    category: Option<String>,
    severity: String,
    remediation: Option<String>,
    endpoint_or_file: Option<String>,
    plugin_name: Option<String>,
}

#[derive(Deserialize)]
struct ScanPayload {
    #[allow(dead_code)]
    event: String,
    scan_id: String,
    project_name: String,
    domain: Option<String>,
    scan_type: String,
    status: String,
    severity_summary: SeveritySummary,
    #[serde(default)]
    findings: Vec<FindingPayload>,
}

/// Payload leve enviado ao frontend via evento Tauri quando um relatorio
/// novo e salvo — alimenta o sininho de notificacoes na topbar.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SecurityReportNotification {
    id: i64,
    project_name: String,
    domain: Option<String>,
    severity_critical: i64,
    severity_high: i64,
    received_at: String,
}

/// Inicia o servidor de webhooks numa thread separada. So inicia de fato
/// se `SECURESCAN_WEBHOOK_SECRET` estiver definida — sem segredo, nao
/// existe endpoint (falha fechado, nunca aberto por padrao).
pub fn start(app: AppHandle, port: u16) {
    let secret = match std::env::var("SECURESCAN_WEBHOOK_SECRET") {
        Ok(s) if !s.trim().is_empty() => s,
        _ => {
            eprintln!(
                "[securescan] variavel de ambiente SECURESCAN_WEBHOOK_SECRET nao definida — \
                 servidor de webhook do SecureScan NAO foi iniciado."
            );
            return;
        }
    };

    // Usamos 0.0.0.0 (nao 127.0.0.1) de proposito: se o SecureScan roda
    // dentro de um container Docker na mesma maquina, ele alcanca o host
    // via `host.docker.internal`, e isso so funciona se o servico do host
    // estiver escutando em todas as interfaces — um bind em 127.0.0.1
    // (so loopback) fica invisivel para o Docker Desktop. O Firewall do
    // Windows continua bloqueando acesso vindo de fora da maquina.
    let addr = format!("0.0.0.0:{port}");
    let server = match Server::http(&addr) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[securescan] falha ao abrir a porta {addr}: {e}");
            return;
        }
    };

    println!("[securescan] escutando webhooks em http://{addr}{WEBHOOK_PATH}");

    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let method = request.method().clone();
            let url = request.url().to_string();
            let response = handle_request(&app, &secret, &mut request);
            let status = response.status_code();
            println!("[securescan] {method} {url} -> {}", status.0);
            let _ = request.respond(response);
        }
    });
}

fn handle_request(
    app: &AppHandle,
    secret: &str,
    request: &mut tiny_http::Request,
) -> Response<Cursor<Vec<u8>>> {
    if request.method() != &Method::Post || request.url() != WEBHOOK_PATH {
        return text_response(404, "not found");
    }

    let auth_header = header_value(request, "Authorization");
    let signature_header = header_value(request, "X-SecureScan-Signature");

    let mut body = String::new();
    if request.as_reader().read_to_string(&mut body).is_err() {
        return text_response(400, "corpo da requisicao invalido");
    }

    // 1) Bearer token — comparacao em tempo constante.
    let expected_auth = format!("Bearer {secret}");
    if !constant_time_eq(auth_header.as_deref().unwrap_or(""), &expected_auth) {
        return text_response(401, "unauthorized");
    }

    // 2) Assinatura HMAC-SHA256, se enviada (recomendado, mas so exigimos
    // se o header vier preenchido — o Bearer sozinho ja autentica).
    if let Some(sig_header) = signature_header {
        match sig_header.strip_prefix("sha256=") {
            Some(hex_sig) => {
                let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
                    Ok(m) => m,
                    Err(_) => return text_response(500, "erro interno"),
                };
                mac.update(body.as_bytes());
                let expected_hex = hex::encode(mac.finalize().into_bytes());
                if !constant_time_eq(&expected_hex, hex_sig) {
                    return text_response(401, "assinatura invalida");
                }
            }
            None => return text_response(401, "formato de assinatura invalido"),
        }
    }

    // 3) Parse do JSON.
    let payload: ScanPayload = match serde_json::from_str(&body) {
        Ok(p) => p,
        Err(e) => {
            // Log detalhado no terminal do app + resposta detalhada (o
            // SecureScan ja mostra o corpo da resposta no proprio log
            // dele, entao isso aparece nos dois lugares).
            eprintln!("[securescan] JSON invalido: {e}");
            eprintln!("[securescan] corpo recebido (primeiros 2000 chars): {}", &body.chars().take(2000).collect::<String>());
            return text_response(400, &format!("json invalido: {e}"));
        }
    };

    // 4) Persiste. O trabalho aqui e leve (parse + alguns INSERTs), entao
    // fazemos de forma sincrona mesmo — responder rapido nao exige fila
    // de background para uma carga tao pequena.
    if let Err(e) = save_report(app, &payload) {
        eprintln!("[securescan] falha ao salvar relatorio {}: {e}", payload.scan_id);
        return text_response(500, "erro ao salvar relatorio");
    }

    text_response(200, "ok")
}

fn save_report(app: &AppHandle, payload: &ScanPayload) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Idempotencia: se esse scan_id ja foi recebido antes (retry do
    // webhook), nao duplica — so confirma 200 sem inserir de novo.
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM security_reports WHERE scan_id = ?1",
            params![payload.scan_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Ok(());
    }

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO security_reports
            (scan_id, project_name, domain, scan_type, status,
             severity_critical, severity_high, severity_medium, severity_low, severity_info, received_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            payload.scan_id,
            payload.project_name,
            payload.domain,
            payload.scan_type,
            payload.status,
            payload.severity_summary.critical,
            payload.severity_summary.high,
            payload.severity_summary.medium,
            payload.severity_summary.low,
            payload.severity_summary.info,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    let report_id = conn.last_insert_rowid();

    for finding in &payload.findings {
        conn.execute(
            "INSERT INTO security_findings
                (report_id, title, description, category, severity, remediation, endpoint_or_file, plugin_name)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                report_id,
                finding.title,
                finding.description,
                finding.category,
                finding.severity,
                finding.remediation,
                finding.endpoint_or_file,
                finding.plugin_name,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    let _ = app.emit(
        "security-report://received",
        SecurityReportNotification {
            id: report_id,
            project_name: payload.project_name.clone(),
            domain: payload.domain.clone(),
            severity_critical: payload.severity_summary.critical,
            severity_high: payload.severity_summary.high,
            received_at: now,
        },
    );

    Ok(())
}

fn header_value(request: &tiny_http::Request, name: &'static str) -> Option<String> {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv(name))
        .map(|h| h.value.as_str().to_string())
}

/// Comparacao de strings em tempo constante (evita timing attack). Byte a
/// byte, sem short-circuit — o tempo de execucao nao revela em qual
/// posicao a diferenca ocorreu.
fn constant_time_eq(a: &str, b: &str) -> bool {
    let a = a.as_bytes();
    let b = b.as_bytes();
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

fn text_response(code: u16, msg: &str) -> Response<Cursor<Vec<u8>>> {
    Response::from_string(msg).with_status_code(code)
}
