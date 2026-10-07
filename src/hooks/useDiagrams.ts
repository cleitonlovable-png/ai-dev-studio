import { useCallback, useEffect, useState } from "react";
import type { CreateDiagramInput, Diagram } from "@/types/diagram";
import { createDiagram, deleteDiagram, listDiagrams, updateDiagram } from "@/services/diagrams";

export function useDiagrams(projectId: number | null) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setDiagrams([]);
      return;
    }
    setLoading(true);
    try {
      setDiagrams(await listDiagrams(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDiagram = useCallback(
    async (input: Omit<CreateDiagramInput, "projectId">) => {
      if (projectId === null) return null;
      const created = await createDiagram({ ...input, projectId });
      await refresh();
      return created;
    },
    [projectId, refresh]
  );

  const editDiagram = useCallback(
    async (id: number, fields: { title: string; mermaidSource: string }) => {
      await updateDiagram(id, fields);
      await refresh();
    },
    [refresh]
  );

  const removeDiagram = useCallback(
    async (id: number) => {
      await deleteDiagram(id);
      await refresh();
    },
    [refresh]
  );

  return { diagrams, loading, addDiagram, editDiagram, removeDiagram, refresh };
}
