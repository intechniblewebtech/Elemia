import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import { check } from '../../commands/check';
import { compare } from '../../commands/compare';
import { convert } from '../../commands/convert';
import { inferSchema } from '../../parser/infer-schema';

const tempDirs: string[] = [];

interface FixtureCase {
  fileName: string;
  expectStrictComparePass: boolean;
}

const FIXTURE_CASES: FixtureCase[] = [
  { fileName: 'bem.module.css', expectStrictComparePass: true },
  { fileName: 'camelCase.module.css', expectStrictComparePass: true },
  { fileName: 'mixed.module.css', expectStrictComparePass: true },
];

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function createTempProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'elemia-migration-integration-'));
  tempDirs.push(dir);
  return dir;
}

async function stageFixture(projectRoot: string, fixtureFileName: string): Promise<string> {
  const fixturePath = join(fixtureRoot, fixtureFileName);
  const cssSource = await readFile(fixturePath, 'utf8');
  const stagedPath = join(projectRoot, basename(fixtureFileName));
  await writeFile(stagedPath, cssSource, 'utf8');
  return stagedPath;
}

function assertTranspileableTypeScript(sourceCode: string, fileName: string): void {
  const result = ts.transpileModule(sourceCode, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      noEmitOnError: true,
    },
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics ?? [];
  const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

  expect(errors, `Expected converted output to transpile cleanly for ${fileName}`).toHaveLength(0);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('migration integration: inferSchema -> convert -> compare -> check', () => {
  it.each(FIXTURE_CASES)('runs full migration pipeline for $fileName', async ({ fileName, expectStrictComparePass }) => {
    const projectRoot = await createTempProject();
    const cssPath = await stageFixture(projectRoot, fileName);

    const cssSource = await readFile(cssPath, 'utf8');
    const inferredSchema = inferSchema(cssSource);
    const schemaPath = join(projectRoot, `${basename(fileName, '.module.css')}.schema.json`);

    await writeFile(schemaPath, JSON.stringify(inferredSchema, null, 2), 'utf8');

    const converted = await convert(basename(cssPath), { cwd: projectRoot });
    expect(converted).toHaveLength(1);

    const convertedPath = converted[0].outputPath;
    expect(convertedPath.replace(/\\/g, '/')).toContain('/__converted__/');

    const convertedSource = await readFile(convertedPath, 'utf8');
    expect(convertedSource).toContain("import { styles } from '@elemia/styles';");
    expect(convertedSource).toContain('export default');

    assertTranspileableTypeScript(convertedSource, convertedPath);

    const compareResult = await compare(cssPath, convertedPath, { strict: true });

    if (expectStrictComparePass) {
      expect(compareResult.exitCode).toBe(0);
      expect(compareResult.diff.added).toEqual([]);
      expect(compareResult.diff.removed).toEqual([]);
    } else {
      expect(compareResult.exitCode).toBe(1);
      expect(compareResult.diff.removed.length + compareResult.diff.added.length).toBeGreaterThan(0);
    }

    const checkResult = await check(cssPath, schemaPath, { strict: true });
    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.diff).toEqual({ missing: [], extra: [] });
  });
});
