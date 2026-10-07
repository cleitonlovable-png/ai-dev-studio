import { invoke } from "@tauri-apps/api/core";
import type { CreateTaskInput, Task, TaskPriority, TaskStatus } from "@/types/task";

export async function listTasks(projectId: number): Promise<Task[]> {
  return invoke<Task[]>("list_tasks", { projectId });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return invoke<Task>("create_task", { input });
}

export async function updateTask(
  id: number,
  fields: { title: string; description?: string | null; priority: TaskPriority; status: TaskStatus; dueDate?: string | null }
): Promise<Task> {
  return invoke<Task>("update_task", { input: { id, ...fields } });
}

export async function toggleTaskStatus(id: number): Promise<Task> {
  return invoke<Task>("toggle_task_status", { id });
}

export async function deleteTask(id: number): Promise<void> {
  return invoke("delete_task", { id });
}
