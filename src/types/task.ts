export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "done";

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  projectId: number;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
}
