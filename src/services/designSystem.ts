import { invoke } from "@tauri-apps/api/core";
import type { ColorToken, DesignSystemData, TypographyToken } from "@/types/designSystem";

/** Forma crua que vem do backend (colors/typography como string JSON). */
interface RawDesignSystem {
  id: number;
  projectId: number;
  colorsJson: string;
  typographyJson: string;
  createdAt: string;
  updatedAt: string;
}

function parseTokens<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toData(raw: RawDesignSystem): DesignSystemData {
  return {
    projectId: raw.projectId,
    colors: parseTokens<ColorToken>(raw.colorsJson),
    typography: parseTokens<TypographyToken>(raw.typographyJson),
    updatedAt: raw.updatedAt,
  };
}

export async function getDesignSystem(projectId: number): Promise<DesignSystemData> {
  const raw = await invoke<RawDesignSystem>("get_design_system", { projectId });
  return toData(raw);
}

export async function updateDesignSystem(
  projectId: number,
  colors: ColorToken[],
  typography: TypographyToken[]
): Promise<DesignSystemData> {
  const raw = await invoke<RawDesignSystem>("update_design_system", {
    input: {
      projectId,
      colorsJson: JSON.stringify(colors),
      typographyJson: JSON.stringify(typography),
    },
  });
  return toData(raw);
}
