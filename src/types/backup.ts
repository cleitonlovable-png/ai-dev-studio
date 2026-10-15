export type BackupType = "manual" | "automatic" | "snapshot" | "before_ai_session";
export type BackupStatus = "pass" | "fail" | "running";

export interface Backup {
  id: number;
  projectId: number;
  type: BackupType;
  reason: string | null;
  path: string;
  sizeBytes: number;
  status: BackupStatus;
  provider: string | null;
  branch: string | null;
  gitStatus: string | null;
  fileCount: number;
  createdAt: string;
}

export interface BackupWithProject extends Backup {
  projectName: string;
}

export interface BackupSettings {
  projectId: number;
  enabled: boolean;
  beforeAiSession: boolean;
  retentionValue: number;
  destination: string;
  excludePatterns: string[];
}
