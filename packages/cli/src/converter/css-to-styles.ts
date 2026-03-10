import { basename, extname } from 'node:path';

import { inferSchema } from '../parser/infer-schema';

const RULE_PATTERN = /\.([_a-zA-Z][_a-zA-Z0-9-]*)\s*\{([^}]*)\}/g;

function toPropertyName(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function parseDeclarations(block: string): Record<string, string> {
  const declarations: Record<string, string> = {};

  for (const rawLine of block.split(';')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const separator = line.indexOf(':');
    if (separator < 0) {
      continue;
    }

    const property = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (property && value) {
      declarations[toPropertyName(property)] = value;
    }
  }

  return declarations;
}

function parseRules(css: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();

  for (const match of css.matchAll(RULE_PATTERN)) {
    const className = match[1];
    const declarations = parseDeclarations(match[2] ?? '');

    if (!className || Object.keys(declarations).length === 0) {
      continue;
    }

    rules.set(className, declarations);
  }

  return rules;
}

function toExportName(blockName: string): string {
  const safe = blockName.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const pascal = safe
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `${pascal || 'Converted'}Styles`;
}

function toStylesObject(
  blockName: string,
  classes: string[],
  rules: Map<string, Record<string, string>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const baseDeclarations = rules.get(blockName);
  if (baseDeclarations) {
    Object.assign(out, baseDeclarations);
  }

  for (const className of classes) {
    if (className === blockName) {
      continue;
    }

    const declarations = rules.get(className);
    if (!declarations) {
      continue;
    }

    out[`& .${className}`] = declarations;
  }

  return out;
}

function blockNameFromPath(sourcePath: string): string {
  const withoutExt = basename(sourcePath, extname(sourcePath));
  return withoutExt.replace(/\.module$/i, '') || 'block';
}

export interface ConversionResult {
  code: string;
  blockName: string;
}

export function convertCssToStyles(css: string, sourcePath: string): ConversionResult {
  const schema = inferSchema(css);
  const blockName = schema.block?.name ?? blockNameFromPath(sourcePath);
  const rules = parseRules(css);
  const styleObject = toStylesObject(blockName, schema.classes, rules);
  const exportName = toExportName(blockName);
  const reviewLines = schema.ambiguous.map((name) => `// REVIEW: could not confidently map class \"${name}\"`);

  const codeLines = [
    "import { styles } from '@elemia/styles';",
    "import type { StyleSheet } from '@elemia/styles';",
    '',
    ...reviewLines,
    ...(reviewLines.length > 0 ? [''] : []),
    `export const ${exportName}: StyleSheet = styles(${JSON.stringify(styleObject, null, 2)}, {`,
    `  blockName: ${JSON.stringify(blockName)},`,
    '});',
    '',
    `export default ${exportName};`,
    '',
  ];

  return {
    code: codeLines.join('\n'),
    blockName,
  };
}
