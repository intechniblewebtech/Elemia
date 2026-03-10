import type { StyleDefinition, StyleValue } from './types';

function toKebabCase(property: string): string {
  const kebab = property
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase();

  return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
}

function isNested(value: StyleValue): value is StyleDefinition {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function serializeObject(definition: StyleDefinition): string {
  const keys = Object.keys(definition).sort((left, right) => left.localeCompare(right));
  const declarations: string[] = [];
  const nestedBlocks: string[] = [];

  for (const key of keys) {
    const value = definition[key];

    if (isNested(value)) {
      const nestedContent = serializeObject(value);
      nestedBlocks.push(`${key} { ${nestedContent} }`);
      continue;
    }

    declarations.push(`${toKebabCase(key)}: ${String(value)};`);
  }

  return [...declarations, ...nestedBlocks].join(' ');
}

/**
 * Serializes a `StyleDefinition` (CSS-as-JS object) into a CSS string.
 *
 * - camelCase property names are converted to kebab-case.
 * - Nested `&` selectors are emitted as CSS nesting blocks.
 * - At-rule keys (`@media`, `@keyframes`, etc.) are passed through verbatim as wrapper blocks.
 * - Output order is deterministic: declarations before nested/at-rule blocks, all sorted
 *   alphabetically by key within each level.
 *
 * @param definition - A `StyleDefinition` object mapping CSS property names (or selectors/at-rules)
 *   to values or nested `StyleDefinition` objects.
 * @returns A CSS string representing the serialized declarations and nested blocks.
 */
export function serialize(definition: StyleDefinition): string {
  return serializeObject(definition).trim();
}
