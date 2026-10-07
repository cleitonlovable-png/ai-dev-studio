import { useEffect, useState } from "react";
import type { RecentFile } from "@/types/filesystem";
import { countProjectFiles, getRecentFiles } from "@/services/filesystem";

export function useRecentFiles(projectPath: string | null, limit = 10) {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectPath) {
      setFiles([]);
      setFileCount(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([getRecentFiles(projectPath, limit), countProjectFiles(projectPath)])
      .then(([recent, count]) => {
        if (!cancelled) {
          setFiles(recent);
          setFileCount(count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFiles([]);
          setFileCount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath, limit]);

  return { files, fileCount, loading };
}
