import { invoke } from "@tauri-apps/api/core";
import type { ScannerStatus } from "@/types/scanner";
import type { SecurityReport } from "@/types/securityReport";

export async function detectSecurityScanners(projectId: number): Promise<ScannerStatus[]> {
  return invoke<ScannerStatus[]>("detect_security_scanners", { projectId });
}

export async function runDependencyScan(projectId: number): Promise<SecurityReport> {
  return invoke<SecurityReport>("run_dependency_scan", { projectId });
}

export async function runSecretScan(projectId: number): Promise<SecurityReport> {
  return invoke<SecurityReport>("run_secret_scan", { projectId });
}

export async function startZapScan(targetUrl: string, apiKey: string | null, confirmed: boolean): Promise<string> {
  return invoke<string>("start_zap_scan", { targetUrl, apiKey, confirmed });
}

export async function getZapScanProgress(zapScanId: string): Promise<number> {
  return invoke<number>("get_zap_scan_progress", { zapScanId });
}

export async function finishZapScan(projectId: number, targetUrl: string): Promise<SecurityReport> {
  return invoke<SecurityReport>("finish_zap_scan", { projectId, targetUrl });
}

export async function listProjectSecurityReports(projectId: number): Promise<SecurityReport[]> {
  return invoke<SecurityReport[]>("list_project_security_reports", { projectId });
}
