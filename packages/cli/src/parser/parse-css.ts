import { readFile } from 'node:fs/promises';

const CLASSNAME_PATTERN = /\.([_a-zA-Z][_a-zA-Z0-9-]*)/g;

export function extractClassNames(css: string): string[] {
  const classNames = new Set<string>();

  for (const match of css.matchAll(CLASSNAME_PATTERN)) {
    const className = match[1];
    if (className) {
      classNames.add(className);
    }
  }

  return Array.from(classNames).sort((a, b) => a.localeCompare(b));
}

export async function parseCSS(filePath: string): Promise<string[]> {
  const css = await readFile(filePath, 'utf8');
  return extractClassNames(css);
}
