-- Migracao 0004: historico de sessoes de IA por projeto.
CREATE TABLE IF NOT EXISTS ai_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    provider    TEXT NOT NULL,   -- codex | claude | ollama
    model       TEXT,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    summary     TEXT,
    next_step   TEXT,
    status      TEXT NOT NULL DEFAULT 'running'  -- running | finished
);
