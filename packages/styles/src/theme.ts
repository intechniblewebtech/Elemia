import { serialize } from './serializer';
import { validateTokens } from './tokens';
import type { GenerateThemeOptions, ThemeMap } from './types';

function escapeThemeName(themeName: string): string {
  return themeName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function generateTheme(themes: ThemeMap, options: GenerateThemeOptions = {}): string {
  const strict = options.strict === true;
  const themeNames = Object.keys(themes).sort((left, right) => left.localeCompare(right));

  return themeNames
    .map((themeName) => {
      const tokens = validateTokens(themes[themeName] ?? {}, strict);
      const cssBody = serialize(tokens);
      return `:root[data-theme="${escapeThemeName(themeName)}"] { ${cssBody} }`;
    })
    .join(' ')
    .trim();
}
