// Impede que uma janela de console adicional apareca no Windows em builds
// de release (padrao gerado pelo Tauri).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod commands;
mod database;
mod events;
mod filesystem;
mod git;
mod procutil;
mod providers;
mod quality;
mod security;
mod terminal;
mod webhook;

use database::DbState;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use terminal::TerminalRegistry;

/// Builds de release rodam com `windows_subsystem = "windows"` (acima),
/// o que evita a janela de console preta por tras do app — mas isso
/// tambem significa que o processo nao tem NENHUM console anexado. O
/// `portable-pty` (usado para abrir o terminal e lancar o Codex/Claude/
/// Ollama) depende da API ConPTY do Windows, que por sua vez precisa de
/// um console valido para duplicar handles ao criar o pseudo-console. Sem
/// esse console, a chamada de spawn do PTY FICA PENDURADA
/// indefinidamente (nunca retorna erro, nunca retorna sucesso) — e como a
/// criacao do PTY acontece dentro do comando Tauri chamado pelo frontend,
/// isso trava a chamada de IPC esperando a resposta para sempre, o que o
/// usuario sente como "o app travou" ao clicar para iniciar uma IA.
///
/// A correcao padrao para apps GUI do Windows que usam PTYs (usada por
/// projetos como o WezTerm) e alocar um console "escondido" assim que o
/// processo inicia: isso da ao ConPTY um console valido para trabalhar,
/// sem nunca mostrar uma janela preta ao usuario (o console e ocultado
/// logo em seguida). Isso NAO afeta builds de debug (`npm run tauri dev`),
/// que ja rodam com um console visivel por padrao — por isso o bug nunca
/// apareceu nos testes anteriores, so no `.exe` compilado.
#[cfg(target_os = "windows")]
fn ensure_hidden_console() {
    use windows_sys::Win32::System::Console::{AllocConsole, GetConsoleWindow};
    use windows_sys::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_HIDE};

    unsafe {
        // Se o processo ja tem um console (build de debug, ou lancado a
        // partir de um terminal), nao faz nada.
        if !GetConsoleWindow().is_null() {
            return;
        }
        // AllocConsole cria um console novo e o anexa a este processo.
        // Se falhar (ex: ja existe um, condicao de corrida improvavel),
        // apenas ignora — nao e fatal, so reduz a chance do PTY funcionar.
        if AllocConsole() != 0 {
            let hwnd = GetConsoleWindow();
            if !hwnd.is_null() {
                ShowWindow(hwnd, SW_HIDE);
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn ensure_hidden_console() {}

fn main() {
    ensure_hidden_console();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Banco de dados fica em <app_data_dir>/aidevstudio.db
            // (no Windows isso cai em algo como
            // C:\Users\<usuario>\AppData\Roaming\com.aidevstudio.app\)
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("nao foi possivel resolver o diretorio de dados do app");
            let db_path = app_data_dir.join("aidevstudio.db");

            let conn = database::init_connection(&db_path)
                .expect("falha ao inicializar o banco de dados SQLite");

            app.manage(DbState(Mutex::new(conn)));
            app.manage(Arc::new(TerminalRegistry::default()));

            // Servidor de webhooks do SecureScan (Fase 8). So inicia de
            // fato se SECURESCAN_WEBHOOK_SECRET estiver definida no
            // ambiente — sem segredo configurado, o endpoint nao existe.
            webhook::start(app.handle().clone(), 4567);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::projects::list_projects,
            commands::projects::create_project,
            commands::projects::touch_project_opened,
            commands::projects::archive_project,
            commands::projects::delete_project,
            commands::git::get_git_status,
            commands::git::get_git_diff,
            commands::git::get_git_log,
            commands::filesystem::get_recent_files,
            commands::filesystem::count_project_files,
            commands::filesystem::refresh_project_stack,
            commands::terminal::list_shells,
            commands::terminal::create_terminal,
            commands::terminal::write_terminal,
            commands::terminal::resize_terminal,
            commands::terminal::close_terminal,
            commands::tasks::list_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::toggle_task_status,
            commands::tasks::delete_task,
            commands::shell::open_in_file_explorer,
            commands::shell::open_in_vscode,
            commands::providers::detect_ai_providers,
            commands::providers::start_ai_provider,
            commands::memory::list_memories,
            commands::memory::create_memory,
            commands::memory::update_memory,
            commands::memory::delete_memory,
            commands::sessions::list_sessions,
            commands::sessions::get_last_session,
            commands::sessions::start_session,
            commands::sessions::finish_session,
            commands::sessions::discard_session,
            commands::backups::get_backup_settings,
            commands::backups::update_backup_settings,
            commands::backups::list_backups,
            commands::backups::list_all_backups,
            commands::backups::create_backup_now,
            commands::backups::restore_backup,
            commands::backups::delete_backup,
            commands::security_reports::list_security_reports,
            commands::security_reports::delete_security_report,
            commands::security_reports::update_finding_status,
            commands::quality::detect_project_checks,
            commands::quality::run_project_check,
            commands::quality::list_check_history,
            commands::security::detect_security_scanners,
            commands::security::run_dependency_scan,
            commands::security::run_secret_scan,
            commands::security::start_zap_scan,
            commands::security::get_zap_scan_progress,
            commands::security::finish_zap_scan,
            commands::security::list_project_security_reports,
            commands::events::list_project_events,
            commands::projects::update_project,
            commands::notes::list_notes,
            commands::notes::create_note,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::projects::create_project_from_scratch,
            commands::projects::link_project_folder,
            commands::diagrams::list_diagrams,
            commands::diagrams::create_diagram,
            commands::diagrams::update_diagram,
            commands::diagrams::delete_diagram,
            commands::design_system::get_design_system,
            commands::design_system::update_design_system,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao rodar a aplicacao AI Dev Studio");
}
