export type ProjectEventType =
  | "PROJECT_OPENED"
  | "BACKUP_CREATED"
  | "BACKUP_RESTORED"
  | "AI_SESSION_STARTED"
  | "AI_SESSION_FINISHED"
  | "FILE_CHANGED"
  | "GIT_STATUS_CHANGED"
  | "BUILD_FINISHED"
  | "TEST_FINISHED"
  | "SECURITY_SCAN_FINISHED"
  | "FINDING_CREATED";

export interface ProjectEvent {
  id: number;
  projectId: number;
  eventType: ProjectEventType;
  /** JSON cru do payload especifico do evento — parseado sob demanda pela UI. */
  payload: string | null;
  createdAt: string;
}
