import { useCallback, useEffect, useState } from "react";
import type { Backup, BackupSettings, BackupType } from "@/types/backup";
import {
  createBackupNow,
  deleteBackup,
  getBackupSettings,
  listBackups,
  restoreBackup,
  updateBackupSettings,
} from "@/services/backups";

export function useBackups(projectId: number | null) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setBackups([]);
      setSettings(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([listBackups(projectId), getBackupSettings(projectId)]);
      setBackups(list);
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createNow = useCallback(
    async (type: BackupType = "manual", reason?: string, provider?: string) => {
      if (projectId === null) return;
      await createBackupNow(projectId, type, reason ?? null, provider ?? null);
      await refresh();
    },
    [projectId, refresh]
  );

  const restore = useCallback(
    async (backupId: number) => {
      await restoreBackup(backupId);
    },
    []
  );

  const remove = useCallback(
    async (backupId: number) => {
      await deleteBackup(backupId);
      await refresh();
    },
    [refresh]
  );

  const saveSettings = useCallback(
    async (fields: { enabled: boolean; beforeAiSession: boolean; retentionValue: number }) => {
      if (projectId === null) return;
      const updated = await updateBackupSettings({ projectId, ...fields });
      setSettings(updated);
    },
    [projectId]
  );

  return { backups, settings, loading, error, createNow, restore, remove, saveSettings, refresh };
}
