import { describe, it, expect } from 'vitest';
import { block } from '../block';
import { hashScope } from '../scope';

const AUTHOR_FILE_PATH = 'src/Card.ts';
const CARD_ROOT = hashScope('card', AUTHOR_FILE_PATH);

// ---------------------------------------------------------------------------
// Fixture styles object used in wrapper mode tests
// ---------------------------------------------------------------------------
const cardStyles: Record<string, string> = {
  card: 'card_abc123',
  'card--compact': 'card--compact_abc123',
  'card__thumbnail': 'card__thumbnail_abc123',
  'card__thumbnail--active': 'card__thumbnail--active_abc123',
};

// ---------------------------------------------------------------------------
// Author mode
// ---------------------------------------------------------------------------
describe('block() — author mode', () => {
  it('returns a callable function', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(typeof b).toBe('function');
  });

  it('b.styles is null in author mode', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.styles).toBeNull();
  });

  it('b(null) returns the sanitized block root class', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null)).toBe(CARD_ROOT);
  });

  it('b(null) sanitizes the block name at creation time', () => {
    const b = block('MyCard', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null)).toBe(hashScope('mycard', AUTHOR_FILE_PATH));
  });

  it('throws at creation if block name sanitizes to empty string', () => {
    expect(() => block('---')).toThrow(
      "[@elemia/core] Block name '---' sanitized to empty string.",
    );
  });

  it('b(element) returns a BEM element class', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b('thumbnail')).toBe(`${CARD_ROOT}__thumbnail`);
  });

  it('b(element) includes the root class first', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    // Root-element class IS the element class (no separate root in element call)
    expect(b('thumbnail')).toBe(`${CARD_ROOT}__thumbnail`);
  });

  it('b(null, modifiers) appends boolean modifier class when true', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { compact: true })).toBe(`${CARD_ROOT} ${CARD_ROOT}--compact`);
  });

  it('b(null, modifiers) omits boolean modifier class when false', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { compact: false })).toBe(CARD_ROOT);
  });

  it('b(null, modifiers) omits modifier class when value is null', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { compact: null })).toBe(CARD_ROOT);
  });

  it('b(null, modifiers) omits modifier class when value is undefined', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { compact: undefined })).toBe(CARD_ROOT);
  });

  it('b(null, modifiers) appends string modifier as key-value class', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { size: 'lg' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-lg`);
  });

  it('b(null, modifiers) orders modifier classes alphabetically by key', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { size: 'lg', compact: true, theme: 'dark' })).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--compact ${CARD_ROOT}--size-lg ${CARD_ROOT}--theme-dark`,
    );
  });

  it('b(null, modifiers) alphabetically orders even when keys provided out of order', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { z: true, a: true, m: true })).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--a ${CARD_ROOT}--m ${CARD_ROOT}--z`,
    );
  });

  it('b(null, ..., extra) appends extra class args after modifiers', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, {}, 'extra-class')).toBe(`${CARD_ROOT} extra-class`);
  });

  it('b(null, ..., extra) deduplicates extra class args', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, {}, 'foo', 'foo', 'bar')).toBe(`${CARD_ROOT} foo bar`);
  });

  it('b(null, ..., extra) filters falsy extra args', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, {}, false, null, undefined, 'valid')).toBe(`${CARD_ROOT} valid`);
  });

  it('full output: root → modifiers (alpha) → extras (deduped)', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b(null, { size: 'lg', compact: true }, 'extra', 'extra', 'more')).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--compact ${CARD_ROOT}--size-lg extra more`,
    );
  });

  it('b.root() returns same output as b(null)', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.root()).toBe(b(null));
  });

  it('b.root(modifiers) returns same output as b(null, modifiers)', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.root({ compact: true })).toBe(b(null, { compact: true }));
  });

  it('b.root(modifiers, extra) returns same output as b(null, modifiers, extra)', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.root({ size: 'sm' }, 'extra')).toBe(b(null, { size: 'sm' }, 'extra'));
  });

  it('b.has() always returns false in author mode', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.has('thumbnail')).toBe(false);
    expect(b.has('nonexistent')).toBe(false);
  });

  it('b.descriptor.name is the original name passed to block()', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.descriptor.name).toBe('card');
  });

  it('b.descriptor.mode is "author"', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.descriptor.mode).toBe('author');
  });

  it('b.descriptor.scopedName is the full scoped class in author mode', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.descriptor.scopedName).toBe(CARD_ROOT);
  });
});

// ---------------------------------------------------------------------------
// Wrapper mode
// ---------------------------------------------------------------------------
describe('block() — wrapper mode', () => {
  it('returns a callable function', () => {
    const b = block(cardStyles, {});
    expect(typeof b).toBe('function');
  });

  it('b.styles returns the CSS Module import object', () => {
    const b = block(cardStyles, {});
    expect(b.styles).toBe(cardStyles);
  });

  it('b(null) returns the CSS Module hashed value for the block root class', () => {
    const b = block(cardStyles, {});
    // 'card' key maps to 'card_abc123' in cardStyles
    expect(b(null)).toBe('card_abc123');
  });

  it('b(null, modifiers) resolves modifier classes through the CSS Module', () => {
    const b = block(cardStyles, {});
    // 'card--compact' key maps to 'card--compact_abc123' in cardStyles
    expect(b(null, { compact: true })).toBe('card_abc123 card--compact_abc123');
  });

  it('b(null, modifiers) falls back to raw BEM key when modifier class not in styles', () => {
    const b = block(cardStyles, {});
    expect(b(null, { missing: true })).toBe('card_abc123 card--missing');
  });

  it('b.descriptor.mode is "wrapper"', () => {
    const b = block(cardStyles, {});
    expect(b.descriptor.mode).toBe('wrapper');
  });

  it('b.descriptor.scopedName is null in wrapper mode', () => {
    const b = block(cardStyles, {});
    expect(b.descriptor.scopedName).toBeNull();
  });

  it('b.has() returns true when the resolved CSS Module key exists', () => {
    const b = block(cardStyles, {});
    // 'card__thumbnail' exists in cardStyles
    expect(b.has('thumbnail')).toBe(true);
  });

  it('b.has() returns false when the key does not exist in styles', () => {
    const b = block(cardStyles, {});
    expect(b.has('nonexistent')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mode detection — overload dispatch
// ---------------------------------------------------------------------------
describe('block() — overload detection', () => {
  it('detects author mode when first arg is a string', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH });
    expect(b.descriptor.mode).toBe('author');
  });

  it('detects wrapper mode when first arg is an object', () => {
    const b = block(cardStyles, {});
    expect(b.descriptor.mode).toBe('wrapper');
  });
});
