import { invoke } from "@tauri-apps/api/core";
import type { SecurityReport } from "@/types/securityReport";

export async function listSecurityReports(): Promise<SecurityReport[]> {
  return invoke<SecurityReport[]>("list_security_reports");
}

export async function deleteSecurityReport(id: number): Promise<void> {
  return invoke("delete_security_report", { id });
}

export async function updateFindingStatus(
  id: number,
  status: "open" | "reviewing" | "false_positive" | "resolved" | "accepted_risk"
): Promise<void> {
  return invoke("update_finding_status", { id, status });
}
