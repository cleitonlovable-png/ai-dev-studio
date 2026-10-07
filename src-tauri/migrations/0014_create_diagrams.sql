-- Migracao 0014: fluxogramas/mapas mentais do projeto, guardados como
-- fonte de texto (sintaxe Mermaid) e renderizados no frontend. Um
-- projeto pode ter varios diagramas (fluxo de telas, arquitetura, etc).
CREATE TABLE IF NOT EXISTS diagrams (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id),
    title           TEXT NOT NULL,
    mermaid_source  TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
