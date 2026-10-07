export interface ColorToken {
  name: string;
  hex: string;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  size: string;
  weight: string;
}

/** Espelha a struct `DesignSystem` do backend — colors/typography chegam
 * como JSON serializado (colorsJson/typographyJson); este tipo é a forma
 * já decodificada que o resto do frontend usa. */
export interface DesignSystemData {
  projectId: number;
  colors: ColorToken[];
  typography: TypographyToken[];
  updatedAt: string;
}
