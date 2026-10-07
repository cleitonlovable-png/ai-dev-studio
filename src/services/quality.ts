import { invoke } from "@tauri-apps/api/core";
import type { CheckType, DetectedCheck, ProjectCheck } from "@/types/qualityCheck";

export async function detectProjectChecks(projectId: number): Promise<DetectedCheck[]> {
  return invoke<DetectedCheck[]>("detect_project_checks", { projectId });
}

export async function runProjectCheck(
  projectId: number,
  type: CheckType,
  tool: string,
  command: string
): Promise<ProjectCheck> {
  return invoke<ProjectCheck>("run_project_check", { input: { projectId, type, tool, command } });
}

export async function listCheckHistory(projectId: number): Promise<ProjectCheck[]> {
  return invoke<ProjectCheck[]>("list_check_history", { projectId });
}
