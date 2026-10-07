-- Migracao 0008: historico de checks de qualidade (build/lint/test) por projeto.
CREATE TABLE IF NOT EXISTS project_checks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id   INTEGER NOT NULL REFERENCES projects(id),
    type         TEXT NOT NULL,   -- build | lint | test
    tool         TEXT,            -- npm | cargo | pytest | ...
    command      TEXT NOT NULL,   -- comando detectado, nunca inventado
    started_at   TEXT NOT NULL,
    finished_at  TEXT,
    status       TEXT NOT NULL DEFAULT 'running',  -- pass | warning | fail | running
    exit_code    INTEGER,
    summary      TEXT,            -- ultimas linhas da saida (curto)
    output_path  TEXT             -- caminho do log completo em disco
);
