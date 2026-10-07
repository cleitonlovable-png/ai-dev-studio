import { invoke } from "@tauri-apps/api/core";
import type { ProjectEvent } from "@/types/timelineEvent";

export async function listProjectEvents(projectId: number): Promise<ProjectEvent[]> {
  return invoke<ProjectEvent[]>("list_project_events", { projectId });
}
