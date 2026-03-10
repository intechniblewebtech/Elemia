import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inferSchema } from '../parser/infer-schema';
import { check } from '../commands/check';
import { diffSchemaClasses } from '../validator/schema-validator';

describe('inferSchema()', () => {
  it('infers bem block, elements, and modifiers', () => {
    const schema = inferSchema('.card { } .card__title { } .card--active { }');

    expect(schema.naming).toBe('bem');
    expect(schema.block).toEqual({
      name: 'card',
      modifiers: ['active'],
    });
    expect(schema.elements).toEqual([
      {
        name: 'title',
        modifiers: [],
      },
    ]);
    expect(schema.ambiguous).toEqual([]);
  });

  it('records camel naming when class names are camelCase', () => {
    const schema = inferSchema('.cardRoot { } .cardTitle { }');

    expect(schema.naming).toBe('camel');
  });

  it('flags mixed naming as ambiguous entries', () => {
    const schema = inferSchema('.card { } .card__title { } .random-class { }');

    expect(schema.ambiguous).toContain('random-class');
  });

  it('returns empty schema for empty css', () => {
    const schema = inferSchema('');

    expect(schema.block).toBeNull();
    expect(schema.classes).toEqual([]);
    expect(schema.ambiguous).toEqual([]);
  });

  it('marks classes as ambiguous when no block-level class is available', () => {
    const schema = inferSchema('.card__title { } .card--active { }');

    expect(schema.block).toBeNull();
    expect(schema.ambiguous).toEqual(['card__title', 'card--active']);
  });
});

describe('schema validator', () => {
  it('returns no drift for perfect class match', () => {
    const diff = diffSchemaClasses(['card', 'card__title'], ['card', 'card__title']);
    expect(diff).toEqual({ missing: [], extra: [] });
  });

  it('lists missing classes (present in CSS, absent in schema)', () => {
    const diff = diffSchemaClasses(['card', 'card__title', 'card--active'], ['card', 'card__title']);
    expect(diff.missing).toEqual(['card--active']);
    expect(diff.extra).toEqual([]);
  });

  it('lists extra classes (present in schema, absent in CSS)', () => {
    const diff = diffSchemaClasses(['card', 'card__title'], ['card', 'card__title', 'card__body']);
    expect(diff.missing).toEqual([]);
    expect(diff.extra).toEqual(['card__body']);
  });
});

describe('check()', () => {
  it('returns exit 0 for perfect match', async () => {
    const root = await mkdtemp(join(tmpdir(), 'elemia-cli-check-'));
    const cssPath = join(root, 'Card.module.css');
    const schemaPath = join(root, 'Card.schema.json');

    await writeFile(cssPath, '.card {} .card__title {}', 'utf8');
    await writeFile(
      schemaPath,
      JSON.stringify({
        naming: 'bem',
        block: { name: 'card', modifiers: [] },
        elements: [{ name: 'title', modifiers: [] }],
        classes: ['card', 'card__title'],
        ambiguous: [],
      }),
      'utf8',
    );

    const result = await check(cssPath, schemaPath, { strict: true });
    expect(result.exitCode).toBe(0);
    expect(result.diff).toEqual({ missing: [], extra: [] });
  });

  it('returns exit 1 with --strict when drift exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'elemia-cli-check-'));
    const cssPath = join(root, 'Card.module.css');
    const schemaPath = join(root, 'Card.schema.json');

    await writeFile(cssPath, '.card {} .card__title {} .card--active {}', 'utf8');
    await writeFile(
      schemaPath,
      JSON.stringify({
        naming: 'bem',
        block: { name: 'card', modifiers: [] },
        elements: [{ name: 'title', modifiers: [] }],
        classes: ['card', 'card__title'],
        ambiguous: [],
      }),
      'utf8',
    );

    const result = await check(cssPath, schemaPath, { strict: true });
    expect(result.exitCode).toBe(1);
    expect(result.diff.missing).toContain('card--active');
    expect(result.output).toMatch(/DRIFT DETECTED/i);
  });

  it('returns structured json output in --json mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'elemia-cli-check-'));
    const cssPath = join(root, 'Card.module.css');
    const schemaPath = join(root, 'Card.schema.json');

    await writeFile(cssPath, '.card {} .card__title {} .card--active {}', 'utf8');
    await writeFile(
      schemaPath,
      JSON.stringify({
        naming: 'bem',
        block: { name: 'card', modifiers: [] },
        elements: [{ name: 'title', modifiers: [] }],
        classes: ['card', 'card__title'],
        ambiguous: [],
      }),
      'utf8',
    );

    const result = await check(cssPath, schemaPath, { strict: true, json: true });
    const json = JSON.parse(result.output) as { diff: { missing: string[] }; exitCode: number };
    expect(json.diff.missing).toContain('card--active');
    expect(json.exitCode).toBe(1);
  });
});
