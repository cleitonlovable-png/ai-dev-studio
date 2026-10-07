-- Migracao 0003: memoria independente das IAs, por projeto.
CREATE TABLE IF NOT EXISTS project_memories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'context',
    -- categorias: decision | architecture | rule | known_bug | pending | context | important
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
