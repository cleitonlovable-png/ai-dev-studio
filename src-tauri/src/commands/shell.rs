use std::path::PathBuf;
use std::process::Command;

/// Abre a pasta do projeto no explorador de arquivos do sistema
/// operacional. SAFE: apenas abre uma janela, nao modifica nada.
#[tauri::command(async)]
pub fn open_in_file_explorer(path: String) -> Result<(), String> {
    let result = if cfg!(target_os = "windows") {
        Command::new("explorer").arg(&path).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(&path).spawn()
    } else {
        Command::new("xdg-open").arg(&path).spawn()
    };

    result.map(|_| ()).map_err(|e| e.to_string())
}

/// Procura o `code.cmd` do VS Code nos locais de instalacao mais comuns
/// no Windows, para o caso (bem frequente) de a instalacao nao ter
/// marcado "Add to PATH". So usado como fallback — a tentativa via PATH
/// vem primeiro.
#[cfg(target_os = "windows")]
fn find_vscode_fallback() -> Option<PathBuf> {
    let candidates: Vec<PathBuf> = [
        std::env::var("LOCALAPPDATA")
            .ok()
            .map(|p| PathBuf::from(p).join(r"Programs\Microsoft VS Code\bin\code.cmd")),
        std::env::var("ProgramFiles")
            .ok()
            .map(|p| PathBuf::from(p).join(r"Microsoft VS Code\bin\code.cmd")),
        std::env::var("ProgramFiles(x86)")
            .ok()
            .map(|p| PathBuf::from(p).join(r"Microsoft VS Code\bin\code.cmd")),
    ]
    .into_iter()
    .flatten()
    .collect();

    candidates.into_iter().find(|p| p.is_file())
}

/// Abre a pasta do projeto no VS Code. Tenta primeiro `code` via PATH
/// (funciona se "Add to PATH" foi marcado na instalacao); se falhar, no
/// Windows tambem tenta os locais de instalacao padrao antes de desistir.
#[tauri::command(async)]
pub fn open_in_vscode(path: String) -> Result<(), String> {
    if Command::new("code").arg(&path).spawn().is_ok() {
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(code_path) = find_vscode_fallback() {
            return Command::new(code_path)
                .arg(&path)
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("Encontrei o VS Code mas falhei ao abrir: {e}"));
        }
    }

    Err("VS Code ('code') não encontrado no PATH nem nos locais de instalação padrão.".to_string())
}
