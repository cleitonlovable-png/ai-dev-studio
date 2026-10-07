-- Migracao 0002: tarefas simples por projeto.
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id   INTEGER NOT NULL REFERENCES projects(id),
    title        TEXT NOT NULL,
    description  TEXT,
    priority     TEXT NOT NULL DEFAULT 'medium',  -- low | medium | high
    status       TEXT NOT NULL DEFAULT 'pending',  -- pending | in_progress | done
    due_date     TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
