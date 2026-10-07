import { invoke } from "@tauri-apps/api/core";
import type { CreateNoteInput, Note } from "@/types/note";

export async function listNotes(projectId: number): Promise<Note[]> {
  return invoke<Note[]>("list_notes", { projectId });
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  return invoke<Note>("create_note", { input });
}

export async function updateNote(
  id: number,
  fields: { title: string; content: string }
): Promise<Note> {
  return invoke<Note>("update_note", { input: { id, ...fields } });
}

export async function deleteNote(id: number): Promise<void> {
  return invoke("delete_note", { id });
}
