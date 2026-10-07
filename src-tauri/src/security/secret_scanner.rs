use super::RawFinding;
use regex::Regex;
use std::fs;
use std::path::Path;

use crate::filesystem::IGNORED_DIRS;

const MAX_FILES_SCANNED: usize = 3000;
const MAX_FILE_SIZE_BYTES: u64 = 2 * 1024 * 1024; // 2 MB
const MAX_FINDINGS: usize = 300;

const BINARY_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "pdf", "zip", "tar", "gz", "7z", "exe",
    "dll", "so", "dylib", "woff", "woff2", "ttf", "eot", "mp4", "mp3", "wav", "avi", "mov",
    "sqlite", "db", "lock",
];

struct Rule {
    name: &'static str,
    severity: &'static str,
    pattern: &'static str,
}

const RULES: &[Rule] = &[
    Rule { name: "AWS Access Key ID", severity: "critical", pattern: r"AKIA[0-9A-Z]{16}" },
    Rule {
        name: "Chave privada",
        severity: "critical",
        pattern: r"-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
    },
    Rule {
        name: "Token do GitHub",
        severity: "critical",
        pattern: r"gh[pousr]_[A-Za-z0-9]{36,}",
    },
    Rule {
        name: "Token do Slack",
        severity: "high",
        pattern: r"xox[baprs]-[0-9A-Za-z-]{10,48}",
    },
    Rule {
        name: "Possível API key/secret em código",
        severity: "medium",
        pattern: r#"(?i)(api[_-]?key|api[_-]?secret|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]"#,
    },
    Rule {
        name: "JWT possivelmente hardcoded",
        severity: "low",
        pattern: r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}",
    },
];

/// Escaneia o projeto inteiro (respeitando as mesmas pastas ignoradas do
/// resto do app) procurando padroes conhecidos de segredo. So roda quando
/// o usuario clica em "Executar" — nenhum arquivo e enviado para lugar
/// nenhum, tudo fica local.
pub fn run(project_path: &str) -> Vec<RawFinding> {
    let regexes: Vec<(&Rule, Regex)> = RULES
        .iter()
        .filter_map(|r| Regex::new(r.pattern).ok().map(|re| (r, re)))
        .collect();

    let root = Path::new(project_path);
    let mut findings = Vec::new();
    let mut scanned = 0usize;

    walk(root, root, &regexes, &mut findings, &mut scanned);
    findings
}

fn walk(
    root: &Path,
    dir: &Path,
    regexes: &[(&Rule, Regex)],
    findings: &mut Vec<RawFinding>,
    scanned: &mut usize,
) {
    if *scanned >= MAX_FILES_SCANNED || findings.len() >= MAX_FINDINGS {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if *scanned >= MAX_FILES_SCANNED || findings.len() >= MAX_FINDINGS {
            return;
        }

        let path = entry.path();
        let file_name = entry.file_name();
        let name_str = file_name.to_string_lossy();

        if path.is_dir() {
            if IGNORED_DIRS.contains(&name_str.as_ref()) {
                continue;
            }
            walk(root, &path, regexes, findings, scanned);
            continue;
        }

        let ext = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        if BINARY_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }

        if let Ok(meta) = entry.metadata() {
            if meta.len() > MAX_FILE_SIZE_BYTES {
                continue;
            }
        }

        *scanned += 1;

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue, // provavelmente binario disfarcado; pula
        };

        let relative = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");

        for (line_no, line) in content.lines().enumerate() {
            for (rule, regex) in regexes.iter() {
                if regex.is_match(line) {
                    findings.push(RawFinding {
                        title: format!("{} encontrado em código", rule.name),
                        description: Some(format!(
                            "Padrão de '{}' detectado. Trecho (mascarado): {}",
                            rule.name,
                            mask(line)
                        )),
                        category: Some("secret".into()),
                        severity: rule.severity.to_string(),
                        remediation: Some(
                            "Remova o segredo do código-fonte, revogue-o e mova para uma variável de ambiente ou cofre de segredos.".into(),
                        ),
                        endpoint_or_file: Some(format!("{relative}:{}", line_no + 1)),
                        plugin_name: Some("secret-scanner (local)".into()),
                    });
                    if findings.len() >= MAX_FINDINGS {
                        return;
                    }
                }
            }
        }
    }
}

/// Mascara a linha inteira para nao gravar o segredo em texto puro no
/// banco de dados — mostra so os primeiros e ultimos caracteres.
/// Usa `chars()` (nao indices de bytes) para nao quebrar em UTF-8.
fn mask(line: &str) -> String {
    let chars: Vec<char> = line.trim().chars().collect();
    if chars.len() <= 12 {
        return "*".repeat(chars.len());
    }
    let start: String = chars[..6].iter().collect();
    let end: String = chars[chars.len() - 4..].iter().collect();
    format!("{start}...{end}")
}
