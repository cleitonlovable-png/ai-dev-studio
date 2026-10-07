import { invoke } from "@tauri-apps/api/core";
import type { AiSession } from "@/types/session";

export async function listSessions(projectId: number): Promise<AiSession[]> {
  return invoke<AiSession[]>("list_sessions", { projectId });
}

export async function getLastSession(projectId: number): Promise<AiSession | null> {
  return invoke<AiSession | null>("get_last_session", { projectId });
}

export async function startSession(projectId: number, provider: string, model: string | null): Promise<AiSession> {
  return invoke<AiSession>("start_session", { input: { projectId, provider, model } });
}

export async function finishSession(
  id: number,
  summary: string | null,
  nextStep: string | null
): Promise<AiSession> {
  return invoke<AiSession>("finish_session", { input: { id, summary, nextStep } });
}

export async function discardSession(id: number): Promise<void> {
  return invoke("discard_session", { id });
}
