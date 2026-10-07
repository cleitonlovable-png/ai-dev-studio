-- Migracao 0015: design system do projeto (paleta de cores e
-- tipografia). Um registro por projeto, guardado como JSON livre —
-- a estrutura exata e responsabilidade do frontend, o backend so
-- persiste a string.
CREATE TABLE IF NOT EXISTS design_systems (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id    INTEGER NOT NULL UNIQUE REFERENCES projects(id),
    colors_json   TEXT NOT NULL DEFAULT '[]',
    typography_json TEXT NOT NULL DEFAULT '[]',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
