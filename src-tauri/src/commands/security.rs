use crate::database::{row_to_finding, DbState, SecurityReport, SELECT_FINDING_COLUMNS};
use crate::events::{self, AppEvent};
use crate::security::{self, RawFinding, ScannerStatus};
use chrono::Utc;
use rusqlite::params;
use tauri::{AppHandle, State};

fn insert_scan_report(
    app: &AppHandle,
    conn: &rusqlite::Connection,
    project_id: i64,
    project_name: &str,
    scan_type: &str,
    findings: &[RawFinding],
) -> Result<i64, String> {
    let now = Utc::now().to_rfc3339();
    let scan_id = uuid::Uuid::new_v4().to_string();

    let (mut critical, mut high, mut medium, mut low, mut info) = (0i64, 0i64, 0i64, 0i64, 0i64);
    for f in findings {
        match f.severity.as_str() {
            "critical" => critical += 1,
            "high" => high += 1,
            "medium" => medium += 1,
            "low" => low += 1,
            _ => info += 1,
        }
    }

    conn.execute(
        "INSERT INTO security_reports
            (scan_id, project_name, domain, scan_type, status,
             severity_critical, severity_high, severity_medium, severity_low, severity_info, received_at, project_id)
         VALUES (?1, ?2, NULL, ?3, 'COMPLETED', ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![scan_id, project_name, scan_type, critical, high, medium, low, info, now, project_id],
    )
    .map_err(|e| e.to_string())?;

    let report_id = conn.last_insert_rowid();

    for f in findings {
        conn.execute(
            "INSERT INTO security_findings
                (report_id, project_id, title, description, category, severity, remediation, endpoint_or_file, plugin_name)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                report_id,
                project_id,
                f.title,
                f.description,
                f.category,
                f.severity,
                f.remediation,
                f.endpoint_or_file,
                f.plugin_name
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    events::emit(
        app,
        AppEvent::SecurityScanFinished {
            project_id,
            scanner: scan_type.to_string(),
            findings: findings.len() as u32,
        },
    );

    Ok(report_id)
}

fn fetch_report(conn: &rusqlite::Connection, report_id: i64) -> Result<SecurityReport, String> {
    let mut report = conn
        .query_row(
            "SELECT id, scan_id, project_name, domain, scan_type, status,
                    severity_critical, severity_high, severity_medium, severity_low, severity_info, received_at, project_id
             FROM security_reports WHERE id = ?1",
            params![report_id],
            |row| {
                Ok(SecurityReport {
                    id: row.get(0)?,
                    scan_id: row.get(1)?,
                    project_name: row.get(2)?,
                    domain: row.get(3)?,
                    scan_type: row.get(4)?,
                    status: row.get(5)?,
                    severity_critical: row.get(6)?,
                    severity_high: row.get(7)?,
                    severity_medium: row.get(8)?,
                    severity_low: row.get(9)?,
                    severity_info: row.get(10)?,
                    received_at: row.get(11)?,
                    project_id: row.get(12)?,
                    findings: Vec::new(),
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {SELECT_FINDING_COLUMNS} FROM security_findings WHERE report_id = ?1");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let findings = stmt
        .query_map(params![report_id], row_to_finding)
        .map_err(|e| e.to_string())?;
    for f in findings {
        report.findings.push(f.map_err(|e| e.to_string())?);
    }

    Ok(report)
}

fn project_path_and_name(conn: &rusqlite::Connection, project_id: i64) -> Result<(String, String), String> {
    conn.query_row(
        "SELECT path, name FROM projects WHERE id = ?1",
        params![project_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )
    .map_err(|_| "Projeto não encontrado.".to_string())
}

#[tauri::command(async)]
pub fn detect_security_scanners(state: State<DbState>, project_id: i64) -> Result<Vec<ScannerStatus>, String> {
    let path = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        project_path_and_name(&conn, project_id)?.0
    };

    let mut scanners = Vec::new();

    let dependency = security::dependency_scanner::detect(&path);
    scanners.push(ScannerStatus {
        id: "dependency",
        label: "Dependências".into(),
        available: dependency.is_some(),
        detail: dependency.map(|(_, cmd)| cmd.to_string()),
        requires_confirmation: false,
    });

    scanners.push(ScannerStatus {
        id: "secret",
        label: "Secrets no código".into(),
        available: true,
        detail: Some("Varredura local — nada sai do seu computador".into()),
        requires_confirmation: false,
    });

    let zap_available = security::zap_scanner::is_available();
    scanners.push(ScannerStatus {
        id: "zap",
        label: "OWASP ZAP".into(),
        available: zap_available,
        detail: if zap_available {
            security::zap_scanner::get_version().map(|v| format!("Detectado — versão {v}"))
        } else {
            Some("Não detectado em http://127.0.0.1:8080".into())
        },
        requires_confirmation: true,
    });

    Ok(scanners)
}

#[tauri::command(async)]
pub fn run_dependency_scan(app: AppHandle, state: State<DbState>, project_id: i64) -> Result<SecurityReport, String> {
    let (path, name, tool) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let (path, name) = project_path_and_name(&conn, project_id)?;
        let tool = security::dependency_scanner::detect(&path)
            .map(|(t, _)| t.to_string())
            .ok_or_else(|| "Nenhuma ferramenta de auditoria de dependências disponível para este projeto.".to_string())?;
        (path, name, tool)
    };

    let findings = security::dependency_scanner::run(&path, &tool)?;

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let report_id = insert_scan_report(&app, &conn, project_id, &name, "DEPENDENCY_SCAN", &findings)?;
    fetch_report(&conn, report_id)
}

#[tauri::command(async)]
pub fn run_secret_scan(app: AppHandle, state: State<DbState>, project_id: i64) -> Result<SecurityReport, String> {
    let (path, name) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        project_path_and_name(&conn, project_id)?
    };

    let findings = security::secret_scanner::run(&path);

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let report_id = insert_scan_report(&app, &conn, project_id, &name, "CODE_SCAN", &findings)?;
    fetch_report(&conn, report_id)
}

/// So chega ate aqui depois que o usuario marcou explicitamente "tenho
/// autorizacao para testar este alvo" na interface — `confirmed` e
/// checado de novo aqui como segunda camada de seguranca, nunca confiando
/// so na UI.
#[tauri::command(async)]
pub fn start_zap_scan(target_url: String, api_key: Option<String>, confirmed: bool) -> Result<String, String> {
    if !confirmed {
        return Err("Confirmação de autorização é obrigatória antes de iniciar um scan ativo.".into());
    }
    security::zap_scanner::start_active_scan(&target_url, api_key.as_deref())
}

#[tauri::command(async)]
pub fn get_zap_scan_progress(zap_scan_id: String) -> Result<u32, String> {
    security::zap_scanner::get_scan_progress(&zap_scan_id)
}

#[tauri::command(async)]
pub fn finish_zap_scan(app: AppHandle, state: State<DbState>, project_id: i64, target_url: String) -> Result<SecurityReport, String> {
    let findings = security::zap_scanner::fetch_alerts(&target_url)?;

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let (_, name) = project_path_and_name(&conn, project_id)?;
    let report_id = insert_scan_report(&app, &conn, project_id, &name, "PENTEST_SCAN", &findings)?;
    fetch_report(&conn, report_id)
}

#[tauri::command(async)]
pub fn list_project_security_reports(state: State<DbState>, project_id: i64) -> Result<Vec<SecurityReport>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = "SELECT id, scan_id, project_name, domain, scan_type, status,
                      severity_critical, severity_high, severity_medium, severity_low, severity_info, received_at, project_id
               FROM security_reports WHERE project_id = ?1 ORDER BY received_at DESC";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let reports = stmt
        .query_map(params![project_id], |row| {
            Ok(SecurityReport {
                id: row.get(0)?,
                scan_id: row.get(1)?,
                project_name: row.get(2)?,
                domain: row.get(3)?,
                scan_type: row.get(4)?,
                status: row.get(5)?,
                severity_critical: row.get(6)?,
                severity_high: row.get(7)?,
                severity_medium: row.get(8)?,
                severity_low: row.get(9)?,
                severity_info: row.get(10)?,
                received_at: row.get(11)?,
                project_id: row.get(12)?,
                findings: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in reports {
        let mut report = row.map_err(|e| e.to_string())?;
        let sql = format!("SELECT {SELECT_FINDING_COLUMNS} FROM security_findings WHERE report_id = ?1");
        let mut fstmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let findings = fstmt
            .query_map(params![report.id], row_to_finding)
            .map_err(|e| e.to_string())?;
        for f in findings {
            report.findings.push(f.map_err(|e| e.to_string())?);
        }
        result.push(report);
    }
    Ok(result)
}
