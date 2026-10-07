import { invoke } from "@tauri-apps/api/core";
import type { CreateMemoryInput, Memory, MemoryCategory } from "@/types/memory";

export async function listMemories(projectId: number): Promise<Memory[]> {
  return invoke<Memory[]>("list_memories", { projectId });
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  return invoke<Memory>("create_memory", { input });
}

export async function updateMemory(
  id: number,
  fields: { title: string; content: string; category: MemoryCategory }
): Promise<Memory> {
  return invoke<Memory>("update_memory", { input: { id, ...fields } });
}

export async function deleteMemory(id: number): Promise<void> {
  return invoke("delete_memory", { id });
}
