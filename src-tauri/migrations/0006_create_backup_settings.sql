-- Migracao 0006: politica de backup configuravel por projeto.
CREATE TABLE IF NOT EXISTS backup_settings (
    project_id         INTEGER PRIMARY KEY REFERENCES projects(id),
    enabled            INTEGER NOT NULL DEFAULT 1,
    before_ai_session  INTEGER NOT NULL DEFAULT 1,
    retention_value    INTEGER NOT NULL DEFAULT 10,
    destination        TEXT,
    exclude_patterns   TEXT  -- JSON array de nomes de pasta a ignorar
);
