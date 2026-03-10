import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { inferSchema } from '../parser/infer-schema';
import { check } from './check';
import { type BlockManifest, type ElemiaManifest, writeManifest } from '../manifest/manifest-writer';

export interface ManifestOptions {
  cwd?: string;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function hasGlob(pattern: string): boolean {
  return /[*?]/.test(pattern);
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  let out = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '*') {
      const next = normalized[index + 1];
      if (next === '*') {
        out += '.*';
        index += 1;
      } else {
        out += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      out += '.';
      continue;
    }

    if (/[-/\\^$+?.()|[\]{}]/.test(char)) {
      out += `\\${char}`;
      continue;
    }

    out += char;
  }

  out += '$';
  return new RegExp(out);
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function resolveCssFiles(input: string, cwd: string): Promise<string[]> {
  const allFiles = await walkFiles(cwd);

  if (hasGlob(input)) {
    const matcher = globToRegExp(normalizePath(input));
    return allFiles
      .filter((filePath) => matcher.test(normalizePath(filePath.slice(cwd.length + 1))))
      .filter((filePath) => filePath.endsWith('.module.css'))
      .sort((left, right) => left.localeCompare(right));
  }

  const candidate = resolve(cwd, input);
  return allFiles
    .filter((filePath) => normalizePath(filePath).startsWith(normalizePath(candidate)))
    .filter((filePath) => filePath.endsWith('.module.css'))
    .sort((left, right) => left.localeCompare(right));
}

function toBlockManifest(cssFile: string, css: string, cwd: string): BlockManifest[] {
  const schema = inferSchema(css);
  if (!schema.block) {
    return [];
  }

  const entry: BlockManifest = {
    name: schema.block.name,
    elements: schema.elements.map((element) => element.name),
    modifiers: schema.block.modifiers,
    naming: schema.naming,
    filePath: normalizePath(cssFile.slice(cwd.length + 1)),
  };

  return [entry];
}

export async function manifest(input: string, outFile: string, options: ManifestOptions = {}): Promise<ElemiaManifest> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const files = await resolveCssFiles(input, cwd);
  const blocks: BlockManifest[] = [];

  for (const filePath of files) {
    // Reuse CLI-03 validator path to ensure schema drift logic remains aligned.
    await check(filePath, undefined, { strict: false });

    const css = await readFile(filePath, 'utf8');
    blocks.push(...toBlockManifest(filePath, css, cwd));
  }

  const result: ElemiaManifest = {
    blocks: blocks.sort((left, right) => left.name.localeCompare(right.name)),
  };

  await writeManifest(resolve(cwd, outFile), result);
  return result;
}
