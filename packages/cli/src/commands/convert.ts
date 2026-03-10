import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { convertCssToStyles } from '../converter/css-to-styles';
import { check } from './check';

export interface ConvertOptions {
  replace?: boolean;
  cwd?: string;
}

export interface ConvertedFile {
  sourcePath: string;
  outputPath: string;
}

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, '/');
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
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function resolveInputFiles(input: string, cwd: string): Promise<string[]> {
  const allFiles = await walkFiles(cwd);

  if (hasGlob(input)) {
    const matcher = globToRegExp(normalizePath(input));
    return allFiles
      .filter((filePath) => matcher.test(normalizePath(filePath.slice(cwd.length + 1))))
      .filter((filePath) => filePath.endsWith('.module.css'))
      .sort((left, right) => left.localeCompare(right));
  }

  const candidate = resolve(cwd, input);
  const candidateStat = await stat(candidate);

  if (candidateStat.isFile()) {
    return candidate.endsWith('.module.css') ? [candidate] : [];
  }

  return allFiles
    .filter((filePath) => normalizePath(filePath).startsWith(normalizePath(candidate)))
    .filter((filePath) => filePath.endsWith('.module.css'))
    .sort((left, right) => left.localeCompare(right));
}

function toOutputPath(sourcePath: string, options: ConvertOptions): string {
  const blockFileName = sourcePath.replace(/\.module\.css$/i, '.block.ts').split(/[/\\]/).pop() ?? 'converted.block.ts';

  if (options.replace) {
    return resolve(dirname(sourcePath), blockFileName);
  }

  return resolve(dirname(sourcePath), '__converted__', blockFileName);
}

export async function convert(input: string, options: ConvertOptions = {}): Promise<ConvertedFile[]> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const files = await resolveInputFiles(input, cwd);
  const converted: ConvertedFile[] = [];

  for (const sourcePath of files) {
    await check(sourcePath, undefined, { strict: false });

    const css = await readFile(sourcePath, 'utf8');
    const result = convertCssToStyles(css, sourcePath);
    const outputPath = toOutputPath(sourcePath, options);

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, result.code, 'utf8');

    converted.push({
      sourcePath,
      outputPath,
    });
  }

  return converted;
}
