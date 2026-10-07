import { useCallback, useEffect, useState } from "react";
import type { ScannerStatus } from "@/types/scanner";
import type { SecurityReport } from "@/types/securityReport";
import {
  detectSecurityScanners,
  listProjectSecurityReports,
  runDependencyScan,
  runSecretScan,
} from "@/services/security";

export function useSecurityScanners(projectId: number | null) {
  const [scanners, setScanners] = useState<ScannerStatus[]>([]);
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setScanners([]);
      setReports([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        detectSecurityScanners(projectId),
        listProjectSecurityReports(projectId),
      ]);
      setScanners(s);
      setReports(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runDependency = useCallback(async () => {
    if (projectId === null) return;
    setRunningId("dependency");
    setError(null);
    try {
      await runDependencyScan(projectId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningId(null);
    }
  }, [projectId, refresh]);

  const runSecret = useCallback(async () => {
    if (projectId === null) return;
    setRunningId("secret");
    setError(null);
    try {
      await runSecretScan(projectId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningId(null);
    }
  }, [projectId, refresh]);

  return { scanners, reports, loading, runningId, error, runDependency, runSecret, refresh };
}
