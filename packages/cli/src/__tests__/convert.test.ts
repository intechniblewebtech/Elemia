import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { convert } from '../commands/convert';
import { convertCssToStyles } from '../converter/css-to-styles';

const tempDirs: string[] = [];

async function createTempProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'elemia-convert-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('convertCssToStyles()', () => {
  it('converts BEM CSS to a styles() object structure', () => {
    const css = [
      '.card { color: red; }',
      '.card__title { font-size: 14px; }',
      '.card--active { display: block; }',
    ].join('\n');

    const result = convertCssToStyles(css, 'Card.module.css');

    expect(result.blockName).toBe('card');
    expect(result.code).toContain("import { styles } from '@elemia/styles';");
    expect(result.code).toContain('"& .card__title"');
    expect(result.code).toContain('"& .card--active"');
  });

  it('adds REVIEW annotations for ambiguous classes', () => {
    const css = ['.card { color: red; }', '.unknown-helper { margin: 0; }'].join('\n');

    const result = convertCssToStyles(css, 'Card.module.css');

    expect(result.code).toContain('// REVIEW: could not confidently map class "unknown-helper"');
  });
});

describe('convert()', () => {
  it('writes output to __converted__ by default', async () => {
    const cwd = await createTempProject();
    const cssPath = join(cwd, 'Card.module.css');
    await writeFile(cssPath, '.card { color: red; }', 'utf8');

    const results = await convert('Card.module.css', { cwd });

    expect(results).toHaveLength(1);
    expect(results[0].outputPath).toContain('__converted__');

    const converted = await readFile(results[0].outputPath, 'utf8');
    expect(converted).toContain('export const CardStyles: StyleSheet');
  });

  it('writes converted output in-place when --replace is enabled', async () => {
    const cwd = await createTempProject();
    await mkdir(join(cwd, 'src'), { recursive: true });
    const cssPath = join(cwd, 'src', 'Card.module.css');
    await writeFile(cssPath, '.card { color: red; }', 'utf8');

    const results = await convert('src/Card.module.css', { cwd, replace: true });

    expect(results).toHaveLength(1);
    expect(results[0].outputPath.replace(/\\/g, '/').endsWith('src/Card.block.ts')).toBe(true);
  });
});