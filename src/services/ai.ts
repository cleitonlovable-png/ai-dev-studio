import { invoke } from "@tauri-apps/api/core";
import type { AiProviderId, AiProviderStatus } from "@/types/ai";

export async function detectAiProviders(): Promise<AiProviderStatus[]> {
  return invoke<AiProviderStatus[]>("detect_ai_providers");
}

/** Retorna o session_id da sessao PTY — o mesmo mecanismo usado pelo terminal comum. */
export async function startAiProvider(projectPath: string, provider: AiProviderId): Promise<string> {
  return invoke<string>("start_ai_provider", { projectPath, provider });
}
