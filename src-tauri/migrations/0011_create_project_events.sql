-- Migracao 0011: timeline de eventos por projeto.
CREATE TABLE IF NOT EXISTS project_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    event_type  TEXT NOT NULL,   -- PROJECT_OPENED | BACKUP_CREATED | ...
    payload     TEXT,            -- JSON livre com detalhes do evento
    created_at  TEXT NOT NULL
);
