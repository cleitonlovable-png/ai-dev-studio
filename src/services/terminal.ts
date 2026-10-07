import { invoke } from "@tauri-apps/api/core";
import type { ShellInfo, ShellKind } from "@/types/terminal";

export async function listShells(): Promise<ShellInfo[]> {
  return invoke<ShellInfo[]>("list_shells");
}

export async function createTerminal(projectPath: string, shell: ShellKind): Promise<string> {
  return invoke<string>("create_terminal", { projectPath, shell });
}

export async function writeTerminal(sessionId: string, data: string): Promise<void> {
  return invoke("write_terminal", { sessionId, data });
}

export async function resizeTerminal(sessionId: string, rows: number, cols: number): Promise<void> {
  return invoke("resize_terminal", { sessionId, rows, cols });
}

export async function closeTerminal(sessionId: string): Promise<void> {
  return invoke("close_terminal", { sessionId });
}
