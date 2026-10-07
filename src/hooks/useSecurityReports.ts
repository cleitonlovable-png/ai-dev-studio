import { useCallback, useEffect, useState } from "react";
import type { SecurityReport } from "@/types/securityReport";
import { deleteSecurityReport, listSecurityReports } from "@/services/securityReports";

export function useSecurityReports() {
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await listSecurityReports());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: number) => {
      await deleteSecurityReport(id);
      await refresh();
    },
    [refresh]
  );

  return { reports, loading, error, remove, refresh };
}
