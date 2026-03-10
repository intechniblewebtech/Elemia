import type { InferredSchema } from '../types';

export interface SchemaDiff {
  missing: string[];
  extra: string[];
}

export function diffSchemaClasses(cssClasses: string[], schemaClasses: string[]): SchemaDiff {
  const cssSet = new Set(cssClasses);
  const schemaSet = new Set(schemaClasses);

  const missing = [...cssSet].filter((name) => !schemaSet.has(name)).sort((a, b) => a.localeCompare(b));
  const extra = [...schemaSet].filter((name) => !cssSet.has(name)).sort((a, b) => a.localeCompare(b));

  return { missing, extra };
}

export function hasDrift(diff: SchemaDiff): boolean {
  return diff.missing.length > 0 || diff.extra.length > 0;
}

export function formatDiffTable(diff: SchemaDiff): string {
  const lines: string[] = ['Elemia schema drift report'];

  if (!hasDrift(diff)) {
    lines.push('Status: OK (no drift)');
    return lines.join('\n');
  }

  lines.push('Status: DRIFT DETECTED');
  lines.push('');
  lines.push('Missing in schema (present in CSS):');
  lines.push(...(diff.missing.length > 0 ? diff.missing.map((name) => `  - ${name}`) : ['  - none']));
  lines.push('');
  lines.push('Extra in schema (not present in CSS):');
  lines.push(...(diff.extra.length > 0 ? diff.extra.map((name) => `  - ${name}`) : ['  - none']));

  return lines.join('\n');
}

export function schemaClasses(schema: InferredSchema): string[] {
  return [...schema.classes].sort((a, b) => a.localeCompare(b));
}
