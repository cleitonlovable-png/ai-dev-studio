/**
 * Fase 4: deteccao real via backend Rust (CLI --version + HTTP local
 * para Ollama). Esses tipos espelham `ProviderStatus` em
 * src-tauri/src/providers/mod.rs.
 */
export type AiProviderId = "codex" | "claude" | "ollama";

export interface AiProviderStatus {
  id: AiProviderId;
  label: string;
  available: boolean;
  version: string | null;
  models: string[] | null;
  detectionNote: string | null;
}
