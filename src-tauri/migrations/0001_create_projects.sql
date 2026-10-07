-- Migracao 0001: tabela base de projetos (Fase 1).
CREATE TABLE IF NOT EXISTS projects (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL,
    path                  TEXT NOT NULL UNIQUE,
    description           TEXT,
    status                TEXT NOT NULL DEFAULT 'active',
    stack                 TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    last_opened_at        TEXT,
    default_ai_provider   TEXT
);
