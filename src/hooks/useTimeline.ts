import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ProjectEvent } from "@/types/timelineEvent";
import { listProjectEvents } from "@/services/timeline";

interface LiveEventPayload {
  type: string;
  payload: Record<string, unknown> & { projectId?: number };
}

export function useTimeline(projectId: number | null) {
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      setEvents(await listProjectEvents(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Escuta o canal ao vivo: se um evento novo chegar para o projeto atual,
  // busca de novo em vez de tentar remontar a linha manualmente (mais
  // simples e sempre consistente com o que o backend gravou).
  useEffect(() => {
    if (projectId === null) return;
    let unlisten: (() => void) | undefined;

    listen<LiveEventPayload>("app://event", (event) => {
      if (event.payload.payload?.projectId === projectId) {
        refresh();
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [projectId, refresh]);

  return { events, loading, refresh };
}
