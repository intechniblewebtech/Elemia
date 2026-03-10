import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { inferSchema } from '../parser/infer-schema';
import { toDts } from '../codegen/dts-writer';

export interface GenerateTypesOptions {
  dryRun?: boolean;
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

async function resolveInputs(input: string | string[], cwd: string): Promise<string[]> {
  const patterns = Array.isArray(input) ? input : [input];
  const resolved = new Set<string>();
  const allFiles = await walkFiles(cwd);

  for (const pattern of patterns) {
    if (hasGlob(pattern)) {
      const matcher = globToRegExp(normalizePath(pattern));
      for (const filePath of allFiles) {
        const relative = normalizePath(filePath.slice(cwd.length + 1));
        if (matcher.test(relative)) {
          resolved.add(filePath);
        }
      }
      continue;
    }

    const absolute = resolve(cwd, pattern);
    try {
      if ((await stat(absolute)).isFile()) {
        resolved.add(absolute);
      }
    } catch {
      // Path does not exist — skip silently
    }
  }

  return [...resolved].sort((left, right) => left.localeCompare(right));
}

function declarationPath(filePath: string): string {
  return `${filePath}.d.ts`;
}

export async function generateTypes(
  input: string | string[],
  options: GenerateTypesOptions = {},
): Promise<Record<string, string>> {
  const cwd = options.cwd ?? process.cwd();
  const matchedFiles = await resolveInputs(input, cwd);
  const outputs: Record<string, string> = {};

  for (const filePath of matchedFiles) {
    if (!filePath.endsWith('.module.css')) {
      continue;
    }

    const css = await readFile(filePath, 'utf8');
    const schema = inferSchema(css);
    const declaration = toDts(schema);
    const outFile = declarationPath(filePath);

    outputs[outFile] = declaration;

    if (options.dryRun) {
      process.stdout.write(`// ${normalizePath(outFile)}\n${declaration}\n`);
      continue;
    }

    await writeFile(outFile, declaration, 'utf8');
  }

  return outputs;
}
