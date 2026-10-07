import { useCallback, useEffect, useState } from "react";
import type { CreateMemoryInput, Memory, MemoryCategory } from "@/types/memory";
import { createMemory, deleteMemory, listMemories, updateMemory } from "@/services/memory";

export function useMemories(projectId: number | null) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setMemories([]);
      return;
    }
    setLoading(true);
    try {
      setMemories(await listMemories(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMemory = useCallback(
    async (input: Omit<CreateMemoryInput, "projectId">) => {
      if (projectId === null) return;
      await createMemory({ ...input, projectId });
      await refresh();
    },
    [projectId, refresh]
  );

  const editMemory = useCallback(
    async (id: number, fields: { title: string; content: string; category: MemoryCategory }) => {
      await updateMemory(id, fields);
      await refresh();
    },
    [refresh]
  );

  const removeMemory = useCallback(
    async (id: number) => {
      await deleteMemory(id);
      await refresh();
    },
    [refresh]
  );

  return { memories, loading, addMemory, editMemory, removeMemory, refresh };
}
