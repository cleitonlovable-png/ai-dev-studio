import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { RecentFile } from "@/types/filesystem";

/**
 * Abre o dialogo nativo do SO para escolher uma pasta local.
 * Retorna null se o usuario cancelar.
 */
export async function pickProjectFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Selecionar pasta do projeto",
  });

  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

/** Extrai um nome de projeto sugerido a partir do caminho escolhido. */
export function suggestProjectName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1] || normalized;
}

export async function getRecentFiles(projectPath: string, limit = 10): Promise<RecentFile[]> {
  return invoke<RecentFile[]>("get_recent_files", { projectPath, limit });
}

export async function countProjectFiles(projectPath: string): Promise<number> {
  return invoke<number>("count_project_files", { projectPath });
}
