use crate::database::{row_to_finding, DbState, SecurityReport, SELECT_FINDING_COLUMNS};
use chrono::Utc;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn list_security_reports(state: State<DbState>) -> Result<Vec<SecurityReport>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, scan_id, project_name, domain, scan_type, status,
                    severity_critical, severity_high, severity_medium, severity_low, severity_info, received_at, project_id
             FROM security_reports ORDER BY received_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let reports = stmt
        .query_map([], |row| {
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

        for finding in findings {
            report.findings.push(finding.map_err(|e| e.to_string())?);
        }

        result.push(report);
    }

    Ok(result)
}

#[tauri::command]
pub fn delete_security_report(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM security_findings WHERE report_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM security_reports WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Atualiza o status de um finding (aberto/revisando/falso positivo/
/// resolvido/risco aceito). NUNCA chamado automaticamente por uma IA —
/// so o usuario, clicando explicitamente, pode marcar como resolvido.
#[tauri::command]
pub fn update_finding_status(state: State<DbState>, id: i64, status: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let resolved_at = if status == "resolved" || status == "false_positive" {
        Some(Utc::now().to_rfc3339())
    } else {
        None
    };
    conn.execute(
        "UPDATE security_findings SET status = ?1, resolved_at = ?2 WHERE id = ?3",
        params![status, resolved_at, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
