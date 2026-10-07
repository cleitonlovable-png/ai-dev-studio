import { useCallback, useEffect, useState } from "react";
import type { CheckType, DetectedCheck, ProjectCheck } from "@/types/qualityCheck";
import { detectProjectChecks, listCheckHistory, runProjectCheck } from "@/services/quality";

export function useQualityChecks(projectId: number | null) {
  const [detected, setDetected] = useState<DetectedCheck[]>([]);
  const [history, setHistory] = useState<ProjectCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningType, setRunningType] = useState<CheckType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setDetected([]);
      setHistory([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [d, h] = await Promise.all([detectProjectChecks(projectId), listCheckHistory(projectId)]);
      setDetected(d);
      setHistory(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(
    async (check: DetectedCheck) => {
      if (projectId === null) return;
      setRunningType(check.checkType);
      setError(null);
      try {
        await runProjectCheck(projectId, check.checkType, check.tool, check.command);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setRunningType(null);
      }
    },
    [projectId, refresh]
  );

  /** Ultimo resultado conhecido de cada tipo (build/lint/test), para o
   * card de Saude do Projeto. */
  const latestByType = (type: CheckType): ProjectCheck | null =>
    history.find((h) => h.type === type && h.status !== "running") ?? null;

  return { detected, history, loading, runningType, error, run, refresh, latestByType };
}
