export type StylePrimitive = string | number;

export type StyleValue = StylePrimitive | StyleDefinition;

export interface StyleDefinition {
  [key: string]: StyleValue;
}

export interface StylesOptions {
  blockName?: string;
  layer?: string;
  theme?: ThemeOptions;
}

export type TokenRecord = Record<string, string>;

export interface ThemeOptions {
  tokens: TokenRecord;
  strict?: boolean;
}

export type ThemeMap = Record<string, TokenRecord>;

export interface GenerateThemeOptions {
  strict?: boolean;
}

export interface StyleSheet {
  blockName: string;
  css: string;
  definition: StyleDefinition;
  layer?: string;
  theme?: ThemeOptions;
}
