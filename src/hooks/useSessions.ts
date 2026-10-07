import { useCallback, useEffect, useState } from "react";
import type { AiSession } from "@/types/session";
import { discardSession, finishSession, listSessions, startSession } from "@/services/sessions";

export function useSessions(projectId: number | null) {
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setSessions([]);
      return;
    }
    setLoading(true);
    try {
      setSessions(await listSessions(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const begin = useCallback(
    async (provider: string, model: string | null) => {
      if (projectId === null) return null;
      const session = await startSession(projectId, provider, model);
      await refresh();
      return session;
    },
    [projectId, refresh]
  );

  const finish = useCallback(
    async (id: number, summary: string | null, nextStep: string | null) => {
      await finishSession(id, summary, nextStep);
      await refresh();
    },
    [refresh]
  );

  const discard = useCallback(
    async (id: number) => {
      await discardSession(id);
      await refresh();
    },
    [refresh]
  );

  const lastFinished = sessions.find((s) => s.status === "finished") ?? null;

  return { sessions, lastFinished, loading, begin, finish, discard, refresh };
}
