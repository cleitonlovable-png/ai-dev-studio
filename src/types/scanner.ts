export type ScannerId = "dependency" | "secret" | "zap";

export interface ScannerStatus {
  id: ScannerId;
  label: string;
  available: boolean;
  detail: string | null;
  requiresConfirmation: boolean;
}
