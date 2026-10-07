-- Migracao 0005: registro de backups locais por projeto.
CREATE TABLE IF NOT EXISTS backups (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id   INTEGER NOT NULL REFERENCES projects(id),
    type         TEXT NOT NULL,   -- manual | automatic | snapshot | before_ai_session
    reason       TEXT,
    path         TEXT NOT NULL,
    size_bytes   INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'pass',  -- pass | fail | running
    provider     TEXT,            -- ex: "codex" quando reason = before_ai_session
    branch       TEXT,
    git_status   TEXT,            -- resumo textual, ex: "3 arquivos modificados"
    file_count   INTEGER NOT NULL DEFAULT 0,
    metadata     TEXT,            -- JSON livre para extensibilidade futura
    created_at   TEXT NOT NULL
);
