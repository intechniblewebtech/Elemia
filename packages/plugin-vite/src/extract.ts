import { findCallSites } from './traverse';

export interface ExtractedStyleAsset {
  blockName: string;
  css: string;
  fileName: string;
  sourceMap: string;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase();
}

function toScopedBlockName(id: string, index: number): string {
  const normalized = normalizePath(id).replace(/\.[a-z0-9]+$/i, '');
  const base = normalized.split('/').pop() ?? `block-${index + 1}`;
  const safe = base.replace(/[^a-z0-9_-]/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return `${safe || 'block'}-${index + 1}`;
}

function toKebabCase(property: string): string {
  return property
    .replace(/^ms[A-Z]/, (match) => `-${match.toLowerCase()}`)
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase();
}

function serializeObject(definition: Record<string, unknown>): string {
  const keys = Object.keys(definition).sort((left, right) => left.localeCompare(right));
  const declarations: string[] = [];
  const nestedBlocks: string[] = [];

  for (const key of keys) {
    const value = definition[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      nestedBlocks.push(`${key} { ${serializeObject(value as Record<string, unknown>)} }`);
      continue;
    }

    declarations.push(`${toKebabCase(key)}: ${String(value)};`);
  }

  return [...declarations, ...nestedBlocks].join(' ').trim();
}

function parseStyleArg(rawArg: string): Record<string, unknown> | null {
  try {
    const value = Function(`"use strict"; return (${rawArg});`)() as unknown;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function createSourceMap(id: string, cssFileName: string): string {
  return JSON.stringify(
    {
      version: 3,
      file: cssFileName,
      sources: [normalizePath(id)],
      names: [],
      mappings: '',
    },
    null,
    2,
  );
}

export function extractStyles(source: string, id: string): ExtractedStyleAsset[] {
  const styleSites = findCallSites(source, id).filter((site) => site.callName === 'styles');

  return styleSites
    .map((site, index) => {
      const definition = parseStyleArg(site.args[0] ?? '');
      if (!definition) {
        return null;
      }

      const blockName = toScopedBlockName(id, index);
      const fileName = `${blockName}.css`;
      const mapName = `${fileName}.map`;
      const cssBody = serializeObject(definition);
      const css = `${cssBody}\n/*# sourceMappingURL=${mapName} */`;

      return {
        blockName,
        css,
        fileName,
        sourceMap: createSourceMap(id, fileName),
      };
    })
    .filter((asset): asset is ExtractedStyleAsset => asset !== null);
}
