-- Migracao 0010: vincula relatorios de scan a um projeto do AI Dev Studio
-- (opcional — fica NULL para relatorios recebidos via webhook do
-- SecureScan, que nao sao amarrados a nenhum projeto especifico).
ALTER TABLE security_reports ADD COLUMN project_id INTEGER REFERENCES projects(id);
