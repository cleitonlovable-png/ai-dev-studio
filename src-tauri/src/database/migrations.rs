use rusqlite::{params, Connection, OptionalExtension};

/// Uma migracao e identificada por um id estavel (o nome do arquivo, sem
/// extensao) e o SQL correspondente, embutido no binario em tempo de
/// compilacao via `include_str!` (assim o app nao depende de arquivos
/// externos existirem no disco do usuario em producao).
pub struct Migration {
    pub id: &'static str,
    pub sql: &'static str,
}

/// Lista de migracoes, em ordem. Para adicionar uma nova tabela/coluna no
/// futuro: criar `migrations/000N_algo.sql` e adicionar uma entrada aqui.
/// Nunca editar uma migracao ja lancada — sempre criar uma nova.
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        id: "0001_create_projects",
        sql: include_str!("../../migrations/0001_create_projects.sql"),
    },
    Migration {
        id: "0002_create_tasks",
        sql: include_str!("../../migrations/0002_create_tasks.sql"),
    },
    Migration {
        id: "0003_create_project_memories",
        sql: include_str!("../../migrations/0003_create_project_memories.sql"),
    },
    Migration {
        id: "0004_create_ai_sessions",
        sql: include_str!("../../migrations/0004_create_ai_sessions.sql"),
    },
    Migration {
        id: "0005_create_backups",
        sql: include_str!("../../migrations/0005_create_backups.sql"),
    },
    Migration {
        id: "0006_create_backup_settings",
        sql: include_str!("../../migrations/0006_create_backup_settings.sql"),
    },
    Migration {
        id: "0007_create_security_reports",
        sql: include_str!("../../migrations/0007_create_security_reports.sql"),
    },
    Migration {
        id: "0008_create_project_checks",
        sql: include_str!("../../migrations/0008_create_project_checks.sql"),
    },
    Migration {
        id: "0009_add_finding_status",
        sql: include_str!("../../migrations/0009_add_finding_status.sql"),
    },
    Migration {
        id: "0010_add_report_project_id",
        sql: include_str!("../../migrations/0010_add_report_project_id.sql"),
    },
    Migration {
        id: "0011_create_project_events",
        sql: include_str!("../../migrations/0011_create_project_events.sql"),
    },
    Migration {
        id: "0012_create_notes",
        sql: include_str!("../../migrations/0012_create_notes.sql"),
    },
    Migration {
        id: "0013_make_path_nullable",
        sql: include_str!("../../migrations/0013_make_path_nullable.sql"),
    },
    Migration {
        id: "0014_create_diagrams",
        sql: include_str!("../../migrations/0014_create_diagrams.sql"),
    },
    Migration {
        id: "0015_create_design_systems",
        sql: include_str!("../../migrations/0015_create_design_systems.sql"),
    },
];

/// Cria a tabela de controle (se nao existir) e aplica, em ordem, toda
/// migracao que ainda nao tenha sido registrada como aplicada.
pub fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            id          TEXT PRIMARY KEY,
            applied_at  TEXT NOT NULL
        );",
    )?;

    for migration in MIGRATIONS {
        let already_applied: Option<String> = conn
            .query_row(
                "SELECT id FROM schema_migrations WHERE id = ?1",
                params![migration.id],
                |row| row.get(0),
            )
            .optional()?;

        if already_applied.is_none() {
            conn.execute_batch(migration.sql)?;
            conn.execute(
                "INSERT INTO schema_migrations (id, applied_at) VALUES (?1, ?2)",
                params![migration.id, chrono::Utc::now().to_rfc3339()],
            )?;
        }
    }

    Ok(())
}
