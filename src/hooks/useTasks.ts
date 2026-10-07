import { useCallback, useEffect, useState } from "react";
import type { CreateTaskInput, Task } from "@/types/task";
import { createTask, deleteTask, listTasks, toggleTaskStatus } from "@/services/tasks";

export function useTasks(projectId: number | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      setTasks(await listTasks(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = useCallback(
    async (input: Omit<CreateTaskInput, "projectId">) => {
      if (projectId === null) return;
      await createTask({ ...input, projectId });
      await refresh();
    },
    [projectId, refresh]
  );

  const toggleDone = useCallback(
    async (id: number) => {
      await toggleTaskStatus(id);
      await refresh();
    },
    [refresh]
  );

  const removeTask = useCallback(
    async (id: number) => {
      await deleteTask(id);
      await refresh();
    },
    [refresh]
  );

  return { tasks, loading, addTask, toggleDone, removeTask, refresh };
}
