use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

/// Tipos de shell que sabemos detectar/iniciar no Windows. `GitBash` e
/// `Cmd` sao especificos do Windows; em Linux/macOS (build futura) o
/// unico caminho realista e `Default` (sh/bash do sistema).
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ShellKind {
    PowerShell,
    Cmd,
    GitBash,
    Default,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShellInfo {
    pub kind: ShellKind,
    pub label: String,
    pub available: bool,
}

/// Detecta quais shells existem nesta maquina. Checagem barata (so
/// `Command::new(...).arg("-Version"/"--version")` seria mais correto,
/// mas para nao disparar processos so para checar, usamos `which`-style:
/// tenta resolver o executavel no PATH / caminhos conhecidos do Windows.
pub fn detect_shells() -> Vec<ShellInfo> {
    let mut shells = vec![
        ShellInfo {
            kind: ShellKind::PowerShell,
            label: "PowerShell".into(),
            available: which("powershell.exe").is_some() || which("pwsh.exe").is_some(),
        },
        ShellInfo {
            kind: ShellKind::Cmd,
            label: "CMD".into(),
            available: which("cmd.exe").is_some(),
        },
        ShellInfo {
            kind: ShellKind::GitBash,
            label: "Git Bash".into(),
            available: find_git_bash().is_some(),
        },
    ];

    // Em Linux/macOS nenhum dos tres acima existe; garante que sempre haja
    // ao menos uma opcao funcional usando o shell padrao do sistema.
    if !shells.iter().any(|s| s.available) {
        shells.push(ShellInfo {
            kind: ShellKind::Default,
            label: "Shell padrão".into(),
            available: true,
        });
    }

    shells
}

fn which(exe: &str) -> Option<std::path::PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    std::env::split_paths(&path_var)
        .map(|dir| dir.join(exe))
        .find(|full_path| full_path.is_file())
}

fn find_git_bash() -> Option<std::path::PathBuf> {
    // Locais mais comuns de instalacao do Git for Windows.
    for candidate in [
        r"C:\Program Files\Git\bin\bash.exe",
        r"C:\Program Files (x86)\Git\bin\bash.exe",
    ] {
        let path = std::path::PathBuf::from(candidate);
        if path.is_file() {
            return Some(path);
        }
    }
    which("bash.exe")
}

fn build_command(kind: ShellKind, cwd: &str) -> CommandBuilder {
    let mut cmd = match kind {
        ShellKind::PowerShell => {
            let exe = if which("pwsh.exe").is_some() { "pwsh.exe" } else { "powershell.exe" };
            CommandBuilder::new(exe)
        }
        ShellKind::Cmd => CommandBuilder::new("cmd.exe"),
        ShellKind::GitBash => {
            let bash = find_git_bash().unwrap_or_else(|| std::path::PathBuf::from("bash"));
            let mut c = CommandBuilder::new(bash);
            c.arg("--login");
            c
        }
        ShellKind::Default => {
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
            CommandBuilder::new(shell)
        }
    };
    cmd.cwd(cwd);
    cmd
}

/// Uma sessao de terminal ativa: o "master" do PTY (usado para redimensionar
/// e para escrever bytes recebidos do frontend) e o processo filho (usado
/// para poder encerrar explicitamente).
pub struct TerminalSession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

#[derive(Default)]
pub struct TerminalRegistry(pub Mutex<HashMap<String, TerminalSession>>);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TerminalDataEvent<'a> {
    session_id: &'a str,
    data: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TerminalExitEvent<'a> {
    session_id: &'a str,
}

/// Cria uma nova sessao de terminal na pasta `cwd`, usando o shell pedido.
/// Uma thread separada fica lendo a saida do PTY e reemitindo cada pedaco
/// para o frontend via evento Tauri `terminal://data`.
pub fn spawn_shell(
    app: AppHandle,
    registry: Arc<TerminalRegistry>,
    cwd: &str,
    shell: ShellKind,
) -> Result<String, String> {
    spawn_pty(app, registry, cwd, build_command(shell, cwd))
}

/// Cria uma sessao de PTY rodando um comando especifico (ex: `codex`,
/// `claude`) em vez de um shell interativo generico. Usado para "iniciar"
/// um provider de IA dentro da pasta do projeto (Fase 4). A leitura/escrita
/// e identica a de um terminal normal — do ponto de vista do frontend e o
/// mesmo componente de terminal, so que anexado a um processo diferente.
pub fn spawn_command(
    app: AppHandle,
    registry: Arc<TerminalRegistry>,
    cwd: &str,
    program: &str,
    args: &[&str],
) -> Result<String, String> {
    let (resolved_program, prefix_args) = resolve_executable(program);

    let mut cmd = CommandBuilder::new(&resolved_program);
    for a in &prefix_args {
        cmd.arg(a);
    }
    for arg in args {
        cmd.arg(arg);
    }
    cmd.cwd(cwd);
    spawn_pty(app, registry, cwd, cmd)
}

/// Resolve o programa a executar de fato. No Windows:
/// - `<name>.exe` roda direto (executavel nativo de verdade).
/// - `<name>.cmd`/`<name>.bat` sao SCRIPTS, nao executaveis — precisam ser
///   invocados atraves do `cmd.exe /C`, senao o Windows recusa com
///   "nao e um aplicativo Win32 valido" mesmo o arquivo existindo.
/// - `<name>.ps1` e script do PowerShell — precisa do `powershell.exe -File`.
/// Isso cobre os tres formatos que o `npm install -g` cria no Windows.
fn resolve_executable(program: &str) -> (String, Vec<String>) {
    #[cfg(target_os = "windows")]
    {
        if crate::procutil::find_on_path(program, &["exe"]).is_some() {
            return (program.to_string(), vec![]);
        }
        if crate::procutil::find_on_path(program, &["cmd", "bat"]).is_some() {
            return ("cmd.exe".to_string(), vec!["/C".to_string(), program.to_string()]);
        }
        if let Some(ps1) = crate::procutil::find_on_path(program, &["ps1"]) {
            return (
                "powershell.exe".to_string(),
                vec![
                    "-NoExit".to_string(),
                    "-ExecutionPolicy".to_string(),
                    "Bypass".to_string(),
                    "-File".to_string(),
                    ps1.to_string_lossy().to_string(),
                ],
            );
        }
    }
    (program.to_string(), vec![])
}

fn spawn_pty(
    app: AppHandle,
    registry: Arc<TerminalRegistry>,
    _cwd: &str,
    cmd: CommandBuilder,
) -> Result<String, String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // O slave so e necessario para o spawn; soltamos o handle em seguida
    // (o child mantem o PTY vivo).
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let session_id = uuid::Uuid::new_v4().to_string();

    {
        let mut sessions = registry.0.lock().map_err(|e| e.to_string())?;
        sessions.insert(
            session_id.clone(),
            TerminalSession {
                master: pair.master,
                writer,
                child,
            },
        );
    }

    // Thread de leitura: bloqueia em read() ate ter dados ou o PTY fechar.
    let session_id_for_thread = session_id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF: processo encerrou
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(
                        "terminal://data",
                        TerminalDataEvent {
                            session_id: &session_id_for_thread,
                            data: chunk,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app.emit(
            "terminal://exit",
            TerminalExitEvent {
                session_id: &session_id_for_thread,
            },
        );
    });

    Ok(session_id)
}

pub fn write(registry: &TerminalRegistry, session_id: &str, data: &str) -> Result<(), String> {
    let mut sessions = registry.0.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get_mut(session_id)
        .ok_or_else(|| "sessao de terminal nao encontrada".to_string())?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())
}

pub fn resize(registry: &TerminalRegistry, session_id: &str, rows: u16, cols: u16) -> Result<(), String> {
    let sessions = registry.0.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get(session_id)
        .ok_or_else(|| "sessao de terminal nao encontrada".to_string())?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

pub fn close(registry: &TerminalRegistry, session_id: &str) -> Result<(), String> {
    let mut sessions = registry.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = sessions.remove(session_id) {
        let _ = session.child.kill();
    }
    Ok(())
}
