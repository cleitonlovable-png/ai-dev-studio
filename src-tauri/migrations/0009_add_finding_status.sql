-- Migracao 0009: ciclo de vida dos findings de seguranca.
-- project_id fica NULL para findings vindos do webhook do SecureScan
-- (nao amarrados a um projeto especifico do AI Dev Studio) e preenchido
-- para findings gerados pelos scanners locais (Fase 8).
ALTER TABLE security_findings ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE security_findings ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE security_findings ADD COLUMN resolved_at TEXT;
ALTER TABLE security_findings ADD COLUMN external_reference TEXT;
