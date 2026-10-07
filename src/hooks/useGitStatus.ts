import { useEffect, useState } from "react";
import type { GitStatus } from "@/types/git";
import { getGitStatus } from "@/services/git";

export function useGitStatus(projectPath: string | null) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getGitStatus(projectPath)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  return { status, loading, error };
}
