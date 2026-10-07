import { invoke } from "@tauri-apps/api/core";
import type { CreateProjectInput, Project } from "@/types/project";

/**
 * Camada de servico: todo o resto do app (hooks, componentes) fala com
 * o backend Rust atraves destas funcoes, nunca chamando `invoke`
 * diretamente. Isso deixa facil trocar a implementacao depois (por
 * exemplo, mockar em testes) sem tocar na UI.
 */

export async function listProjects(): Promise<Project[]> {
  return invoke<Project[]>("list_projects");
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return invoke<Project>("create_project", { input });
}

export interface CreateProjectFromScratchInput {
  name: string;
  description?: string | null;
}

/** Cria um projeto "do zero" — so nome e descricao, sem pasta ainda. */
export async function createProjectFromScratch(
  input: CreateProjectFromScratchInput
): Promise<Project> {
  return invoke<Project>("create_project_from_scratch", { input });
}

/** Vincula uma pasta local a um projeto que nasceu sem uma (promove de
 * ideia/planejamento para projeto completo). */
export async function linkProjectFolder(projectId: number, path: string): Promise<Project> {
  return invoke<Project>("link_project_folder", { input: { projectId, path } });
}

export async function touchProjectOpened(projectId: number): Promise<void> {
  return invoke("touch_project_opened", { projectId });
}

export async function refreshProjectStack(projectId: number): Promise<Project> {
  return invoke<Project>("refresh_project_stack", { projectId });
}

export async function archiveProject(projectId: number): Promise<void> {
  return invoke("archive_project", { projectId });
}

export interface UpdateProjectFields {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  defaultAiProvider?: string | null;
}

export async function updateProject(input: UpdateProjectFields): Promise<Project> {
  return invoke<Project>("update_project", { input });
}

export async function deleteProject(projectId: number): Promise<void> {
  return invoke("delete_project", { projectId });
}
