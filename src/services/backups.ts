import { invoke } from "@tauri-apps/api/core";
import type { Backup, BackupSettings, BackupType, BackupWithProject } from "@/types/backup";

export async function getBackupSettings(projectId: number): Promise<BackupSettings> {
  return invoke<BackupSettings>("get_backup_settings", { projectId });
}

export async function updateBackupSettings(input: {
  projectId: number;
  enabled: boolean;
  beforeAiSession: boolean;
  retentionValue: number;
}): Promise<BackupSettings> {
  return invoke<BackupSettings>("update_backup_settings", { input });
}

export async function listBackups(projectId: number): Promise<Backup[]> {
  return invoke<Backup[]>("list_backups", { projectId });
}

export async function createBackupNow(
  projectId: number,
  type: BackupType,
  reason?: string | null,
  provider?: string | null
): Promise<Backup> {
  return invoke<Backup>("create_backup_now", { input: { projectId, type, reason, provider } });
}

export async function listAllBackups(limit = 50): Promise<BackupWithProject[]> {
  return invoke<BackupWithProject[]>("list_all_backups", { limit });
}

export async function restoreBackup(backupId: number): Promise<void> {
  return invoke("restore_backup", { backupId });
}

export async function deleteBackup(backupId: number): Promise<void> {
  return invoke("delete_backup", { backupId });
}
