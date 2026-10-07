import { invoke } from "@tauri-apps/api/core";

export async function openInFileExplorer(path: string): Promise<void> {
  return invoke("open_in_file_explorer", { path });
}

export async function openInVsCode(path: string): Promise<void> {
  return invoke("open_in_vscode", { path });
}
