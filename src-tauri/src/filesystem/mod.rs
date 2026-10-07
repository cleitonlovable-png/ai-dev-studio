use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

/// Pastas que nunca entram na listagem de "arquivos recentes" nem na
/// contagem de arquivos do projeto — são geradas/baixadas, não editadas
/// por humanos, e normalmente enormes.
pub const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
    "coverage",
    ".cache",
    ".turbo",
    ".svelte-kit",
    "vendor",
];

/// Detecta a stack principal de um projeto olhando arquivos-marcadores na
/// raiz da pasta. Verificacao simples e barata (so `exists()`), sem parsear
/// conteudo — suficiente para a Fase 2. Retorna algo como "Next.js" quando
/// consegue refinar, ou o marcador generico ("Node.js") caso contrario.
pub fn detect_stack(project_path: &str) -> Option<String> {
    let root = Path::new(project_path);
    if !root.is_dir() {
        return None;
    }

    let has = |name: &str| root.join(name).exists();

    // Ordem importa: do mais especifico para o mais generico.
    if has("next.config.js") || has("next.config.ts") || has("next.config.mjs") {
        return Some("Next.js".into());
    }
    if has("vite.config.ts") || has("vite.config.js") {
        return Some("Vite".into());
    }
    if has("nuxt.config.ts") || has("nuxt.config.js") {
        return Some("Nuxt".into());
    }
    if has("pyproject.toml") {
        return Some("Python".into());
    }
    if has("requirements.txt") {
        return Some("Python".into());
    }
    if has("Cargo.toml") {
        return Some("Rust".into());
    }
    if has("composer.json") {
        return Some("PHP".into());
    }
    if has("pom.xml") || has("build.gradle") || has("build.gradle.kts") {
        return Some("Java".into());
    }
    if root.join("supabase").is_dir() {
        return Some("Supabase".into());
    }
    if has("package.json") {
        return Some("Node.js".into());
    }
    if has(".git") {
        return Some("Git".into());
    }

    None
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecentFile {
    pub name: String,
    pub relative_path: String,
    pub modified_at: String, // RFC3339
}

/// Percorre recursivamente a pasta do projeto (pulando `IGNORED_DIRS`) e
/// devolve os `limit` arquivos modificados mais recentemente.
///
/// Implementacao propositalmente simples (sem crate de walk externa) e com
/// um teto de profundidade/quantidade para nao travar em projetos gigantes.
pub fn list_recent_files(project_path: &str, limit: usize) -> Vec<RecentFile> {
    let root = Path::new(project_path);
    let mut found: Vec<(PathBuf, std::time::SystemTime)> = Vec::new();

    walk(root, root, 0, &mut found);

    found.sort_by(|a, b| b.1.cmp(&a.1));
    found.truncate(limit);

    found
        .into_iter()
        .filter_map(|(path, modified)| {
            let relative = path.strip_prefix(root).ok()?.to_string_lossy().replace('\\', "/");
            let name = path.file_name()?.to_string_lossy().to_string();
            let modified_at = chrono::DateTime::<chrono::Utc>::from(modified).to_rfc3339();
            Some(RecentFile {
                name,
                relative_path: relative,
                modified_at,
            })
        })
        .collect()
}

const MAX_DEPTH: usize = 8;
const MAX_FILES_SCANNED: usize = 5000;

fn walk(root: &Path, dir: &Path, depth: usize, out: &mut Vec<(PathBuf, std::time::SystemTime)>) {
    if depth > MAX_DEPTH || out.len() >= MAX_FILES_SCANNED {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if out.len() >= MAX_FILES_SCANNED {
            return;
        }

        let path = entry.path();
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();

        if file_name_str.starts_with('.') && path.is_dir() && file_name_str != ".git" {
            // pastas ocultas em geral (exceto .git, que ja esta na blocklist
            // e tratada abaixo) — evita escanear coisas como .idea, .vscode
            continue;
        }

        if path.is_dir() {
            if IGNORED_DIRS.contains(&file_name_str.as_ref()) {
                continue;
            }
            walk(root, &path, depth + 1, out);
        } else if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                // Ignora arquivos com timestamp igual ao epoch (comuns em
                // alguns filesystems/containers quando o metadado nao esta
                // disponivel) para nao poluir a lista com "modificado em 1970".
                if modified > UNIX_EPOCH {
                    out.push((path, modified));
                }
            }
        }
    }
}

/// Conta arquivos totais do projeto (respeitando as mesmas pastas
/// ignoradas). Usado no card "Resumo do Projeto".
pub fn count_files(project_path: &str) -> usize {
    let root = Path::new(project_path);
    let mut found = Vec::new();
    walk(root, root, 0, &mut found);
    found.len()
}
