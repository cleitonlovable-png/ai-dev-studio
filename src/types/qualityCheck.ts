export type CheckType = "build" | "lint" | "test";
export type CheckStatus = "pass" | "warning" | "fail" | "running";

export interface DetectedCheck {
  checkType: CheckType;
  tool: string;
  command: string;
}

export interface ProjectCheck {
  id: number;
  projectId: number;
  type: CheckType;
  tool: string | null;
  command: string;
  startedAt: string;
  finishedAt: string | null;
  status: CheckStatus;
  exitCode: number | null;
  summary: string | null;
  outputPath: string | null;
}
