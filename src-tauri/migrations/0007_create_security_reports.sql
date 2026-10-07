-- Migracao 0007: relatorios de seguranca recebidos via webhook (SecureScan).
CREATE TABLE IF NOT EXISTS security_reports (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id             TEXT NOT NULL UNIQUE,
    project_name        TEXT NOT NULL,
    domain              TEXT,
    scan_type           TEXT NOT NULL,
    status              TEXT NOT NULL,
    severity_critical   INTEGER NOT NULL DEFAULT 0,
    severity_high       INTEGER NOT NULL DEFAULT 0,
    severity_medium     INTEGER NOT NULL DEFAULT 0,
    severity_low        INTEGER NOT NULL DEFAULT 0,
    severity_info       INTEGER NOT NULL DEFAULT 0,
    received_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_findings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id         INTEGER NOT NULL REFERENCES security_reports(id),
    title             TEXT NOT NULL,
    description       TEXT,
    category          TEXT,
    severity          TEXT NOT NULL,
    remediation       TEXT,
    endpoint_or_file  TEXT,
    plugin_name       TEXT
);
