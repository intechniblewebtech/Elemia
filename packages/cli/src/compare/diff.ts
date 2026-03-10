import { readFile } from 'node:fs/promises';

import { inferSchema } from '../parser/infer-schema';

export interface SemanticDiff {
  originalClasses: string[];
  convertedClasses: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
  hasDifferences: boolean;
}

function sortUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function extractConvertedClasses(convertedSource: string): string[] {
  const classes = new Set<string>();

  const blockNameMatch = convertedSource.match(/blockName:\s*['"]([^'"]+)['"]/);
  if (blockNameMatch?.[1]) {
    classes.add(blockNameMatch[1]);
  }

  const selectorPattern = /["']&\s+\.([_a-zA-Z][_a-zA-Z0-9-]*)["']/g;
  for (const match of convertedSource.matchAll(selectorPattern)) {
    if (match[1]) {
      classes.add(match[1]);
    }
  }

  return sortUnique(classes);
}

export async function diffSemanticClasses(originalCssFile: string, convertedTsFile: string): Promise<SemanticDiff> {
  const [cssSource, convertedSource] = await Promise.all([
    readFile(originalCssFile, 'utf8'),
    readFile(convertedTsFile, 'utf8'),
  ]);

  const originalSchema = inferSchema(cssSource);
  const originalClasses = sortUnique(originalSchema.classes);
  const convertedClasses = extractConvertedClasses(convertedSource);

  const originalSet = new Set(originalClasses);
  const convertedSet = new Set(convertedClasses);

  const added = sortUnique(convertedClasses.filter((className) => !originalSet.has(className)));
  const removed = sortUnique(originalClasses.filter((className) => !convertedSet.has(className)));
  const unchanged = sortUnique(originalClasses.filter((className) => convertedSet.has(className)));

  return {
    originalClasses,
    convertedClasses,
    added,
    removed,
    unchanged,
    hasDifferences: added.length > 0 || removed.length > 0,
  };
}

export function formatSemanticDiff(diff: SemanticDiff): string {
  const lines: string[] = [];

  lines.push('Elemia semantic diff');
  lines.push('');

  if (!diff.hasDifferences) {
    lines.push('No semantic differences detected.');
    lines.push(`Compared classes: ${diff.originalClasses.length}`);
    return lines.join('\n');
  }

  lines.push('--- original (.module.css)');
  lines.push('+++ converted (.block.ts)');
  lines.push('');

  for (const removed of diff.removed) {
    lines.push(`- ${removed}`);
  }

  for (const added of diff.added) {
    lines.push(`+ ${added}`);
  }

  lines.push('');
  lines.push(`Summary: ${diff.removed.length} removed, ${diff.added.length} added, ${diff.unchanged.length} unchanged`);

  return lines.join('\n');
}
