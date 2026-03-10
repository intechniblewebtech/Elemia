import { readFile } from 'node:fs/promises';

import { inferSchema } from '../parser/infer-schema';
import type { InferredSchema } from '../types';
import { diffSchemaClasses, formatDiffTable, hasDrift, schemaClasses, type SchemaDiff } from '../validator/schema-validator';

export interface CheckOptions {
  strict?: boolean;
  json?: boolean;
}

export interface CheckResult {
  exitCode: 0 | 1;
  diff: SchemaDiff;
  output: string;
}

function parseSchemaFile(contents: string): InferredSchema {
  const parsed = JSON.parse(contents) as InferredSchema;

  if (!parsed || !Array.isArray(parsed.classes)) {
    throw new Error('Invalid schema file: expected an InferredSchema JSON object with a classes array.');
  }

  return parsed;
}

export async function check(
  cssFile: string,
  schemaFile?: string,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const cssContents = await readFile(cssFile, 'utf8');
  const inferredCssSchema = inferSchema(cssContents);

  const targetSchema = schemaFile
    ? parseSchemaFile(await readFile(schemaFile, 'utf8'))
    : inferredCssSchema;

  const diff = diffSchemaClasses(inferredCssSchema.classes, schemaClasses(targetSchema));
  const drift = hasDrift(diff);
  const strict = options.strict === true;
  const exitCode: 0 | 1 = strict && drift ? 1 : 0;

  const output = options.json
    ? JSON.stringify({ diff, drift, strict, exitCode }, null, 2)
    : formatDiffTable(diff);

  return {
    exitCode,
    diff,
    output,
  };
}
