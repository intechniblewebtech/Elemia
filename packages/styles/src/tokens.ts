export type TokenRecord = Record<string, string>;

const CSS_VAR_REFERENCE = /^var\(--[a-z0-9-]+\)$/i;
const CSS_LITERAL =
  /^(#[0-9a-f]{3,8}|-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw)?|[a-z-]+|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;

function toCssVarName(tokenKey: string): string {
  return tokenKey
    .trim()
    .replace(/([A-Z])/g, '-$1')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function isStrictTokenValue(value: string): boolean {
  return CSS_VAR_REFERENCE.test(value.trim()) || CSS_LITERAL.test(value.trim());
}

export function validateTokens(tokens: TokenRecord, strict = false): TokenRecord {
  if (!strict) {
    return tokens;
  }

  for (const [key, rawValue] of Object.entries(tokens)) {
    const value = String(rawValue).trim();
    if (!isStrictTokenValue(value)) {
      throw new Error(
        `Invalid token value for "${key}": "${rawValue}". ` +
          'Use a CSS literal (e.g. "red", "16px", "#fff") or var(--token).',
      );
    }
  }

  return tokens;
}

export function serializeTokens(tokens: TokenRecord): string {
  const keys = Object.keys(tokens).sort((a, b) => a.localeCompare(b));
  return keys
    .map((key) => `--${toCssVarName(key)}: ${tokens[key]};`)
    .join(' ')
    .trim();
}
