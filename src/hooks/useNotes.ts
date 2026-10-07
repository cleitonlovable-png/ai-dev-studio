import { useCallback, useEffect, useState } from "react";
import type { CreateNoteInput, Note } from "@/types/note";
import { createNote, deleteNote, listNotes, updateNote } from "@/services/notes";

export function useNotes(projectId: number | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setNotes([]);
      return;
    }
    setLoading(true);
    try {
      setNotes(await listNotes(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNote = useCallback(
    async (input: Omit<CreateNoteInput, "projectId">) => {
      if (projectId === null) return;
      await createNote({ ...input, projectId });
      await refresh();
    },
    [projectId, refresh]
  );

  const editNote = useCallback(
    async (id: number, fields: { title: string; content: string }) => {
      await updateNote(id, fields);
      await refresh();
    },
    [refresh]
  );

  const removeNote = useCallback(
    async (id: number) => {
      await deleteNote(id);
      await refresh();
    },
    [refresh]
  );

  return { notes, loading, addNote, editNote, removeNote, refresh };
}
