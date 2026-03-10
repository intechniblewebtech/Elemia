import { describe, it, expect } from 'vitest';
import { block } from '../block';
import { hashScope } from '../scope';

const AUTHOR_FILE_PATH = 'src/Card.ts';
const CARD_ROOT = hashScope('card', AUTHOR_FILE_PATH);

// ---------------------------------------------------------------------------
// CORE-04: b.root() — named alias for b(null, ...)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fixture styles object used in wrapper mode tests
// ---------------------------------------------------------------------------
const cardStyles: Record<string, string> = {
  card: 'card_abc123',
  'card--compact': 'card--compact_abc123',
  'card--size-sm': 'card--size-sm_abc123',
  'card--size-lg': 'card--size-lg_abc123',
  'card__thumbnail': 'card__thumbnail_abc123',
};

// ---------------------------------------------------------------------------
// Author mode — b.root() with no schema
// ---------------------------------------------------------------------------
describe('b.root() — author mode, no schema', () => {
  const b = block('card', { __filePath: AUTHOR_FILE_PATH });

  it('b.root() returns the block root class', () => {
    expect(b.root()).toBe(CARD_ROOT);
  });

  it('b.root() is an exact alias for b(null)', () => {
    expect(b.root()).toBe(b(null));
  });

  it('b.root() with no args returns same as b(null, undefined)', () => {
    expect(b.root()).toBe(b(null, undefined));
  });
});

// ---------------------------------------------------------------------------
// Author mode — b.root() with modifier arguments
// ---------------------------------------------------------------------------
describe('b.root() — author mode, modifiers', () => {
  const b = block('card', { __filePath: AUTHOR_FILE_PATH });

  it('b.root({ modifier: true }) produces identical output to b(null, { modifier: true })', () => {
    expect(b.root({ compact: true })).toBe(b(null, { compact: true }));
  });

  it('b.root({ modifier: false }) produces identical output to b(null, { modifier: false })', () => {
    expect(b.root({ compact: false })).toBe(b(null, { compact: false }));
  });

  it('b.root({ modifier: true }) appends the modifier class', () => {
    expect(b.root({ compact: true })).toBe(`${CARD_ROOT} ${CARD_ROOT}--compact`);
  });

  it('b.root({ modifier: false }) omits the modifier class', () => {
    expect(b.root({ compact: false })).toBe(CARD_ROOT);
  });

  it('b.root({ modifier: "value" }) appends key-value modifier class', () => {
    expect(b.root({ size: 'lg' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-lg`);
  });

  it('b.root(modifiers) orders modifier classes alphabetically', () => {
    expect(b.root({ z: true, a: true, m: true })).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--a ${CARD_ROOT}--m ${CARD_ROOT}--z`,
    );
  });
});

// ---------------------------------------------------------------------------
// Author mode — b.root() with extra class arguments
// ---------------------------------------------------------------------------
describe('b.root() — author mode, extra class arguments', () => {
  const b = block('card', { __filePath: AUTHOR_FILE_PATH });

  it('b.root(modifiers, extra) produces identical output to b(null, modifiers, extra)', () => {
    expect(b.root({ compact: true }, 'extra-class')).toBe(
      b(null, { compact: true }, 'extra-class'),
    );
  });

  it('b.root(modifiers, extra) appends extra after modifier classes', () => {
    expect(b.root({ size: 'sm' }, 'highlight')).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-sm highlight`);
  });

  it('b.root() filters falsy extra class args', () => {
    expect(b.root({}, false, null, undefined, 'valid')).toBe(`${CARD_ROOT} valid`);
  });

  it('b.root() deduplicates repeated extra class args', () => {
    expect(b.root({}, 'foo', 'foo', 'bar')).toBe(`${CARD_ROOT} foo bar`);
  });

  it('b.root() full output: root → modifiers (alpha) → extras (deduped)', () => {
    expect(b.root({ size: 'lg', compact: true }, 'extra', 'extra', 'more')).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--compact ${CARD_ROOT}--size-lg extra more`,
    );
  });
});

// ---------------------------------------------------------------------------
// Author mode — b.root() with boolean modifier schema (CORE-03)
// ---------------------------------------------------------------------------
describe('b.root() — author mode, boolean modifier schema', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: { disabled: true, compact: true },
  });

  it('b.root({ disabled: true }) appends schema-aware boolean modifier class', () => {
    expect(b.root({ disabled: true })).toBe(`${CARD_ROOT} ${CARD_ROOT}--disabled`);
  });

  it('b.root({ disabled: false }) omits the modifier class', () => {
    expect(b.root({ disabled: false })).toBe(CARD_ROOT);
  });

  it('b.root() is exact alias for b(null) with boolean schema', () => {
    expect(b.root({ disabled: true, compact: false })).toBe(
      b(null, { disabled: true, compact: false }),
    );
  });
});

// ---------------------------------------------------------------------------
// Author mode — b.root() with enum modifier schema (CORE-03)
// ---------------------------------------------------------------------------
describe('b.root() — author mode, enum modifier schema', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: { size: ['sm', 'md', 'lg'] as const },
  });

  it('b.root({ size: "lg" }) appends schema-aware enum modifier class', () => {
    expect(b.root({ size: 'lg' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-lg`);
  });

  it('b.root() is exact alias for b(null) with enum schema', () => {
    expect(b.root({ size: 'sm' })).toBe(b(null, { size: 'sm' }));
  });
});

// ---------------------------------------------------------------------------
// Author mode — b.root() when elements schema is present
// ---------------------------------------------------------------------------
describe('b.root() — author mode, elements schema present', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    elements: ['thumbnail', 'overlay'] as const,
    modifiers: { compact: true },
  });

  it('b.root() returns block root class regardless of elements schema', () => {
    expect(b.root()).toBe(CARD_ROOT);
  });

  it('b.root(modifiers) applies block-level modifiers', () => {
    expect(b.root({ compact: true })).toBe(`${CARD_ROOT} ${CARD_ROOT}--compact`);
  });
});

// ---------------------------------------------------------------------------
// Wrapper mode — b.root() resolves through CSS Module
// ---------------------------------------------------------------------------
describe('b.root() — wrapper mode', () => {
  const b = block(cardStyles, {});

  it('b.root() returns the hashed CSS Module value for the block root class', () => {
    expect(b.root()).toBe('card_abc123');
  });

  it('b.root() is an exact alias for b(null) in wrapper mode', () => {
    expect(b.root()).toBe(b(null));
  });

  it('b.root({ compact: true }) resolves modifier class through CSS Module', () => {
    expect(b.root({ compact: true })).toBe('card_abc123 card--compact_abc123');
  });

  it('b.root(modifiers) is exact alias for b(null, modifiers) in wrapper mode', () => {
    expect(b.root({ compact: true })).toBe(b(null, { compact: true }));
  });

  it('b.root(modifiers, extra) is exact alias for b(null, modifiers, extra) in wrapper mode', () => {
    expect(b.root({ compact: true }, 'extra')).toBe(b(null, { compact: true }, 'extra'));
  });
});

// ---------------------------------------------------------------------------
// Wrapper mode — b.root() with modifier schema
// ---------------------------------------------------------------------------
describe('b.root() — wrapper mode, modifier schema', () => {
  const b = block(cardStyles, {
    modifiers: { compact: true, size: ['sm', 'lg'] as const },
  });

  it('b.root({ compact: true }) resolves through CSS Module with schema', () => {
    expect(b.root({ compact: true })).toBe('card_abc123 card--compact_abc123');
  });

  it('b.root({ size: "sm" }) resolves enum modifier through CSS Module', () => {
    expect(b.root({ size: 'sm' })).toBe('card_abc123 card--size-sm_abc123');
  });

  it('b.root(modifiers) is exact alias for b(null, modifiers) with schema in wrapper mode', () => {
    expect(b.root({ size: 'lg' })).toBe(b(null, { size: 'lg' }));
  });
});
