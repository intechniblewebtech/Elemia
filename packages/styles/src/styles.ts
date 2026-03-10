import type { StyleDefinition, StyleSheet, StylesOptions } from './types';
import { serializeTokens, validateTokens } from './tokens';

function serializeDefinition(definition: StyleDefinition): string {
  const keys = Object.keys(definition).sort((a, b) => a.localeCompare(b));
  const parts: string[] = [];

  for (const key of keys) {
    const value = definition[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = serializeDefinition(value as StyleDefinition);
      parts.push(`${key} { ${nested} }`);
      continue;
    }

    parts.push(`${toKebabCase(key)}: ${String(value)};`);
  }

  return parts.join(' ');
}

function toKebabCase(property: string): string {
  const kebab = property
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase();

  return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
}

export function styles(definition: StyleDefinition, options: StylesOptions = {}): StyleSheet {
  const cssBody = serializeDefinition(definition).trim();
  const blockName = options.blockName ?? 'anonymous';
  const themeCss = options.theme
    ? serializeTokens(validateTokens(options.theme.tokens, options.theme.strict))
    : '';
  const combinedCss = [themeCss, cssBody].filter(Boolean).join(' ').trim();
  const css = options.layer ? `@layer ${options.layer} { ${combinedCss} }` : combinedCss;

  const sheet: StyleSheet = {
    blockName,
    css,
    definition,
  };

  if (options.layer) {
    sheet.layer = options.layer;
  }

  if (options.theme) {
    sheet.theme = options.theme;
  }

  return sheet;
}
