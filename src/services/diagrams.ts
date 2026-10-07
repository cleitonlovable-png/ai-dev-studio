import { invoke } from "@tauri-apps/api/core";
import type { CreateDiagramInput, Diagram } from "@/types/diagram";

export async function listDiagrams(projectId: number): Promise<Diagram[]> {
  return invoke<Diagram[]>("list_diagrams", { projectId });
}

export async function createDiagram(input: CreateDiagramInput): Promise<Diagram> {
  return invoke<Diagram>("create_diagram", { input });
}

export async function updateDiagram(
  id: number,
  fields: { title: string; mermaidSource: string }
): Promise<Diagram> {
  return invoke<Diagram>("update_diagram", { input: { id, ...fields } });
}

export async function deleteDiagram(id: number): Promise<void> {
  return invoke("delete_diagram", { id });
}
