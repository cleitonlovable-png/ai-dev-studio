use serde::Serialize;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub modified: Vec<String>,
    pub added: Vec<String>,
    pub removed: Vec<String>,
    pub untracked: Vec<String>,
    pub last_commit: Option<GitCommit>,
    pub remote_url: Option<String>,
    pub clean: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

/// Roda `git <args>` na pasta do projeto e retorna stdout (trim), ou None
/// se o comando falhar (git ausente, pasta nao existe, etc). Todas as
/// chamadas deste modulo sao SAFE (somente leitura) — ver `security::classify`.
fn run_git(project_path: &str, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(project_path)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn get_status(project_path: &str) -> GitStatus {
    let is_repo = Path::new(project_path).join(".git").is_dir();

    if !is_repo {
        return GitStatus {
            is_repo: false,
            branch: None,
            modified: vec![],
            added: vec![],
            removed: vec![],
            untracked: vec![],
            last_commit: None,
            remote_url: None,
            clean: true,
        };
    }

    let branch = run_git(project_path, &["rev-parse", "--abbrev-ref", "HEAD"])
        .filter(|b| !b.is_empty() && b != "HEAD");

    let porcelain = run_git(project_path, &["status", "--porcelain"]).unwrap_or_default();

    let mut modified = Vec::new();
    let mut added = Vec::new();
    let mut removed = Vec::new();
    let mut untracked = Vec::new();

    for line in porcelain.lines() {
        if line.len() < 3 {
            continue;
        }
        let code = &line[0..2];
        let file = line[3..].to_string();

        match code {
            "??" => untracked.push(file),
            " M" | "M " | "MM" => modified.push(file),
            "A " | "AM" => added.push(file),
            " D" | "D " => removed.push(file),
            _ => modified.push(file),
        }
    }

    let clean = modified.is_empty() && added.is_empty() && removed.is_empty() && untracked.is_empty();

    let last_commit = run_git(
        project_path,
        &["log", "-1", "--pretty=format:%H%n%s%n%an%n%aI"],
    )
    .and_then(|raw| {
        let mut lines = raw.lines();
        Some(GitCommit {
            hash: lines.next()?.chars().take(7).collect(),
            message: lines.next()?.to_string(),
            author: lines.next()?.to_string(),
            date: lines.next()?.to_string(),
        })
    });

    let remote_url = run_git(project_path, &["remote", "get-url", "origin"]);

    GitStatus {
        is_repo: true,
        branch,
        modified,
        added,
        removed,
        untracked,
        last_commit,
        remote_url,
        clean,
    }
}

/// Diff de um arquivo especifico (texto), usado pela aba "Git" -> "Ver Diff".
/// Continua SAFE: `git diff` nao modifica nada no repositorio.
pub fn get_diff(project_path: &str, file: &str) -> Option<String> {
    run_git(project_path, &["diff", "--", file])
}

/// Historico recente (ultimos N commits), usado em "Ver Histórico".
pub fn get_log(project_path: &str, limit: u32) -> Vec<GitCommit> {
    let limit_arg = format!("-{limit}");
    let raw = run_git(
        project_path,
        &["log", &limit_arg, "--pretty=format:%H%n%s%n%an%n%aI%n---"],
    )
    .unwrap_or_default();

    raw.split("---")
        .filter_map(|block| {
            let mut lines = block.trim().lines();
            Some(GitCommit {
                hash: lines.next()?.chars().take(7).collect(),
                message: lines.next()?.to_string(),
                author: lines.next()?.to_string(),
                date: lines.next()?.to_string(),
            })
        })
        .filter(|c| !c.hash.is_empty())
        .collect()
}
