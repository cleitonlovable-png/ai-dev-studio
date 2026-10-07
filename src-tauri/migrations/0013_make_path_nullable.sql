-- Migracao 0013: permite criar um projeto "do zero" (fase de ideia/
-- planejamento), sem pasta vinculada ainda. SQLite nao suporta
-- "ALTER COLUMN ... DROP NOT NULL" diretamente, entao reconstruimos a
-- tabela preservando os dados e todos os ids (FKs de outras tabelas
-- continuam validas).
PRAGMA foreign_keys = OFF;

CREATE TABLE projects_new (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL,
    path                  TEXT UNIQUE,
    description           TEXT,
    status                TEXT NOT NULL DEFAULT 'active',
    stack                 TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    last_opened_at        TEXT,
    default_ai_provider   TEXT
);

INSERT INTO projects_new (id, name, path, description, status, stack, created_at, updated_at, last_opened_at, default_ai_provider)
SELECT id, name, path, description, status, stack, created_at, updated_at, last_opened_at, default_ai_provider
FROM projects;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;

PRAGMA foreign_keys = ON;
