export type MemoryCategory =
  | "decision"
  | "architecture"
  | "rule"
  | "known_bug"
  | "pending"
  | "context"
  | "important";

export interface Memory {
  id: number;
  projectId: number;
  title: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryInput {
  projectId: number;
  title: string;
  content: string;
  category: MemoryCategory;
}
