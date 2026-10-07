use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::time::Instant;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DetectedCheck {
    pub check_type: String, // build | lint | test
    pub tool: String,
    pub command: String,
}

/// Detecta scripts JA EXISTENTES no projeto — nunca inventa comando.
/// So sugere o que encontrar de fato (package.json scripts, Cargo.toml,
/// arquivos de teste Python). Se nao achar nada, retorna lista vazia.
pub fn detect_checks(project_path: &str) -> Vec<DetectedCheck> {
    let root = Path::new(project_path);
    let mut checks = Vec::new();

    let package_json = root.join("package.json");
    if package_json.is_file() {
        if let Ok(content) = fs::read_to_string(&package_json) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(scripts) = json.get("scripts").and_then(|s| s.as_object()) {
                    if scripts.contains_key("build") {
                        checks.push(DetectedCheck {
                            check_type: "build".into(),
                            tool: "npm".into(),
                            command: "npm run build".into(),
                        });
                    }
                    if scripts.contains_key("lint") {
                        checks.push(DetectedCheck {
                            check_type: "lint".into(),
                            tool: "npm".into(),
                            command: "npm run lint".into(),
                        });
                    }
                    if scripts.contains_key("test") {
                        checks.push(DetectedCheck {
                            check_type: "test".into(),
                            tool: "npm".into(),
                            command: "npm test".into(),
                        });
                    }
                }
            }
        }
    }

    if root.join("Cargo.toml").is_file() {
        checks.push(DetectedCheck {
            check_type: "build".into(),
            tool: "cargo".into(),
            command: "cargo build".into(),
        });
        checks.push(DetectedCheck {
            check_type: "test".into(),
            tool: "cargo".into(),
            command: "cargo test".into(),
        });
    }

    if root.join("pyproject.toml").is_file()
        || root.join("requirements.txt").is_file()
        || root.join("pytest.ini").is_file()
    {
        checks.push(DetectedCheck {
            check_type: "test".into(),
            tool: "pytest".into(),
            command: "pytest".into(),
        });
    }

    checks
}

pub struct RunResult {
    pub status: String, // pass | fail
    pub exit_code: Option<i32>,
    pub output: String,
    #[allow(dead_code)]
    pub duration_secs: f64,
}

/// Roda o comando na pasta do projeto e captura stdout+stderr. So roda
/// comandos que o proprio usuario escolheu explicitamente clicar em
/// "Executar" — nunca dispara nada sozinho.
pub fn run_command(project_path: &str, command: &str) -> RunResult {
    let start = Instant::now();

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", command])
            .current_dir(project_path)
            .output()
    } else {
        Command::new("sh")
            .args(["-c", command])
            .current_dir(project_path)
            .output()
    };

    let duration_secs = start.elapsed().as_secs_f64();

    match output {
        Ok(out) => {
            let mut combined = String::from_utf8_lossy(&out.stdout).to_string();
            combined.push_str(&String::from_utf8_lossy(&out.stderr));
            RunResult {
                status: if out.status.success() { "pass".into() } else { "fail".into() },
                exit_code: out.status.code(),
                output: combined,
                duration_secs,
            }
        }
        Err(e) => RunResult {
            status: "fail".into(),
            exit_code: None,
            output: format!("Falha ao executar o comando: {e}"),
            duration_secs,
        },
    }
}
