use super::RawFinding;
use serde_json::Value;
use std::path::Path;
use std::process::Command;

/// Detecta qual ferramenta de auditoria de dependencias faz sentido para
/// este projeto: `npm audit` se houver package.json, `cargo audit` se
/// houver Cargo.toml E o subcomando `cargo audit` estiver instalado.
/// Retorna None se nao houver nenhuma opcao viavel — nunca inventa.
pub fn detect(project_path: &str) -> Option<(&'static str, &'static str)> {
    let root = Path::new(project_path);

    if root.join("package.json").is_file() {
        return Some(("npm", "npm audit --json"));
    }

    if root.join("Cargo.toml").is_file() && cargo_audit_installed() {
        return Some(("cargo", "cargo audit --json"));
    }

    None
}

fn cargo_audit_installed() -> bool {
    Command::new("cargo")
        .args(["audit", "--version"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Roda a auditoria e devolve os findings encontrados. Faz o parse de
/// forma defensiva (campo por campo, sem `unwrap`) porque o formato exato
/// do JSON varia entre versoes do npm/cargo-audit — se algo nao bater,
/// aquele item especifico e ignorado em vez de derrubar o scan inteiro.
pub fn run(project_path: &str, tool: &str) -> Result<Vec<RawFinding>, String> {
    let (program, args): (&str, &[&str]) = match tool {
        "npm" => ("npm", &["audit", "--json"]),
        "cargo" => ("cargo", &["audit", "--json"]),
        _ => return Err(format!("ferramenta desconhecida: {tool}")),
    };

    let output = Command::new(program)
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("falha ao rodar {program}: {e}"))?;

    // `npm audit` retorna exit code != 0 quando ACHA vulnerabilidades —
    // isso e esperado, nao e uma falha de execucao. So tratamos como erro
    // de verdade se nao conseguirmos nem parsear a saida como JSON.
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("não foi possível interpretar a saída de {program}: {e}"))?;

    match tool {
        "npm" => Ok(parse_npm_audit(&json)),
        "cargo" => Ok(parse_cargo_audit(&json)),
        _ => Ok(Vec::new()),
    }
}

fn parse_npm_audit(json: &Value) -> Vec<RawFinding> {
    let mut findings = Vec::new();

    if let Some(vulns) = json.get("vulnerabilities").and_then(|v| v.as_object()) {
        for (package, info) in vulns {
            let severity = info
                .get("severity")
                .and_then(|s| s.as_str())
                .unwrap_or("info")
                .to_string();

            let via_text = info
                .get("via")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .filter(|s| !s.is_empty());

            findings.push(RawFinding {
                title: format!("Dependência vulnerável: {package}"),
                description: via_text,
                category: Some("dependency".into()),
                severity: normalize_severity(&severity),
                remediation: Some("Rode `npm audit fix` (ou atualize a dependência manualmente).".into()),
                endpoint_or_file: Some("package.json".into()),
                plugin_name: Some("npm audit".into()),
            });
        }
    }

    findings
}

fn parse_cargo_audit(json: &Value) -> Vec<RawFinding> {
    let mut findings = Vec::new();

    if let Some(list) = json
        .get("vulnerabilities")
        .and_then(|v| v.get("list"))
        .and_then(|v| v.as_array())
    {
        for item in list {
            let advisory = item.get("advisory");
            let title = advisory
                .and_then(|a| a.get("title"))
                .and_then(|t| t.as_str())
                .unwrap_or("Vulnerabilidade em dependência Rust")
                .to_string();
            let description = advisory
                .and_then(|a| a.get("description"))
                .and_then(|d| d.as_str())
                .map(|s| s.to_string());
            let severity = advisory
                .and_then(|a| a.get("severity"))
                .and_then(|s| s.as_str())
                .unwrap_or("medium");
            let package = item
                .get("package")
                .and_then(|p| p.get("name"))
                .and_then(|n| n.as_str())
                .unwrap_or("desconhecido");
            let advisory_id = advisory.and_then(|a| a.get("id")).and_then(|i| i.as_str());

            findings.push(RawFinding {
                title: format!("{title} ({package})"),
                description,
                category: Some("dependency".into()),
                severity: normalize_severity(severity),
                remediation: Some("Rode `cargo update` ou veja o advisory para a versão corrigida.".into()),
                endpoint_or_file: Some("Cargo.toml".into()),
                plugin_name: advisory_id.map(|s| format!("cargo-audit ({s})")).or(Some("cargo-audit".into())),
            });
        }
    }

    findings
}

fn normalize_severity(raw: &str) -> String {
    match raw.to_lowercase().as_str() {
        "critical" => "critical",
        "high" => "high",
        "moderate" | "medium" => "medium",
        "low" => "low",
        _ => "info",
    }
    .to_string()
}
