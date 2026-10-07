/**
 * Espelha a struct `Project` do backend Rust (src-tauri/src/database/mod.rs).
 * Mantenha os dois em sincronia manualmente por enquanto (Fase 1).
 */
export type ProjectStatus = "active" | "paused" | "done" | "archived";

export interface Project {
  id: number;
  name: string;
  /** `null` enquanto o projeto está na fase de ideia/planejamento, sem
   * pasta local vinculada ainda (ver `linkProjectFolder`). */
  path: string | null;
  description: string | null;
  status: ProjectStatus;
  stack: string | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  defaultAiProvider: string | null;
}

/** Payload para criar um novo projeto (Fase 1: nome, caminho e descricao). */
export interface CreateProjectInput {
  name: string;
  path: string;
  description?: string | null;
}
