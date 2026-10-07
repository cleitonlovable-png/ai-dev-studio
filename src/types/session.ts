export type SessionStatus = "running" | "finished";

export interface AiSession {
  id: number;
  projectId: number;
  provider: string;
  model: string | null;
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
  nextStep: string | null;
  status: SessionStatus;
}
