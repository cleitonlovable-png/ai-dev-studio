export type ShellKind = "POWER_SHELL" | "CMD" | "GIT_BASH" | "DEFAULT";

export interface ShellInfo {
  kind: ShellKind;
  label: string;
  available: boolean;
}
