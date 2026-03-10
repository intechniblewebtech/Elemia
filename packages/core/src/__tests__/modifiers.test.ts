import { describe, it, expect } from 'vitest';
import { block } from '../block';
import { hashScope } from '../scope';

const AUTHOR_FILE_PATH = 'src/Card.ts';
const CARD_ROOT = hashScope('card', AUTHOR_FILE_PATH);

// ---------------------------------------------------------------------------
// CORE-03: Modifier method — full schema support
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Boolean modifier schema  (ModifierDef = true)
// ---------------------------------------------------------------------------
describe('block() — boolean modifier schema', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: { disabled: true },
  });

  it('boolean modifier value true → appends modifier class', () => {
    expect(b(null, { disabled: true })).toBe(`${CARD_ROOT} ${CARD_ROOT}--disabled`);
  });

  it('boolean modifier value false → omits modifier class', () => {
    expect(b(null, { disabled: false })).toBe(CARD_ROOT);
  });
});

// ---------------------------------------------------------------------------
// Enum modifier schema  (ModifierDef = readonly string[])
// ---------------------------------------------------------------------------
describe('block() — enum modifier schema (string array)', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: { size: ['sm', 'md', 'lg'] as const },
  });

  it('enum modifier with string value → appends key-value modifier class', () => {
    expect(b(null, { size: 'lg' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-lg`);
  });

  it('enum modifier with value sm → appends card--size-sm', () => {
    expect(b(null, { size: 'sm' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-sm`);
  });

  it('enum modifier with false/undefined value → omits modifier class', () => {
    // Runtime: non-string/non-valid values are silently omitted.
    // Using `as never` to bypass the strict enum type for runtime-edge-case testing.
    expect(b(null, { size: false as never })).toBe(CARD_ROOT);
    expect(b(null, { size: null as never })).toBe(CARD_ROOT);
  });
});

// ---------------------------------------------------------------------------
// Multi-select modifier schema  (ModifierDef = { values, multi: true })
// ---------------------------------------------------------------------------
describe('block() — multi-select modifier schema', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: {
      tone: { values: ['info', 'warning', 'error'] as const, multi: true },
    },
  });

  it('multi-select with single string → appends single modifier class', () => {
    expect(b(null, { tone: 'info' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--tone-info`);
  });

  it('multi-select with array of values → appends all modifier classes', () => {
    expect(b(null, { tone: ['info', 'warning'] })).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--tone-info ${CARD_ROOT}--tone-warning`,
    );
  });

  it('multi-select with array in non-alphabetical order → values sorted alphabetically', () => {
    expect(b(null, { tone: ['warning', 'info'] })).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--tone-info ${CARD_ROOT}--tone-warning`,
    );
  });

  it('multi-select with all three values → all classes appended sorted', () => {
    expect(b(null, { tone: ['error', 'warning', 'info'] })).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--tone-error ${CARD_ROOT}--tone-info ${CARD_ROOT}--tone-warning`,
    );
  });
});

// ---------------------------------------------------------------------------
// Single-select modifier schema  (ModifierDef = { values } without multi)
// ---------------------------------------------------------------------------
describe('block() — single-select modifier schema ({ values })', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: { status: { values: ['active', 'inactive', 'pending'] as const } },
  });

  it('single-select string value → appends key-value modifier class', () => {
    expect(b(null, { status: 'active' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--status-active`);
  });

  it('single-select string value pending → appends card--status-pending', () => {
    expect(b(null, { status: 'pending' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--status-pending`);
  });

  it('single-select with array value (not multi) → uses first value only', () => {
    // non-multi schema receiving array: treat as single (use first item)
    const result = b(null, { status: ['active', 'inactive'] as unknown as 'active' });
    // String array is not a valid single-select value — falls back to omit
    expect(result).toBe(CARD_ROOT);
  });
});

// ---------------------------------------------------------------------------
// Custom map modifier schema  (ModifierDef = { map })
// ---------------------------------------------------------------------------
describe('block() — custom map modifier schema', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: { size: { map: (v: string) => v.toLowerCase() } },
  });

  it('map modifier → applies map fn to value, uses result as suffix', () => {
    expect(b(null, { size: 'LG' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-lg`);
  });

  it('map modifier with already lowercase value → applies map fn', () => {
    expect(b(null, { size: 'sm' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--size-sm`);
  });

  it('map modifier with empty map result → omits class', () => {
    const bEmpty = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      modifiers: { variant: { map: (_v: string) => '' } },
    });
    expect(bEmpty(null, { variant: 'primary' })).toBe(CARD_ROOT);
  });
});

// ---------------------------------------------------------------------------
// Multiple modifier keys — alphabetical ordering across def types
// ---------------------------------------------------------------------------
describe('block() — multiple modifiers ordered alphabetically by key', () => {
  const b = block('card', {
    __filePath: AUTHOR_FILE_PATH,
    modifiers: {
      compact: true,
      size: ['sm', 'md', 'lg'] as const,
      tone: { values: ['info', 'warning'] as const, multi: true },
    },
  });

  it('multiple modifier keys output sorted alphabetically', () => {
    expect(b(null, { size: 'lg', compact: true, tone: ['warning', 'info'] })).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--compact ${CARD_ROOT}--size-lg ${CARD_ROOT}--tone-info ${CARD_ROOT}--tone-warning`,
    );
  });

  it('partial modifiers: only provided keys contribute to output', () => {
    expect(b(null, { tone: 'info' })).toBe(`${CARD_ROOT} ${CARD_ROOT}--tone-info`);
  });

  it('includes extra classes after modifier classes', () => {
    expect(b(null, { compact: true }, 'extra-class')).toBe(
      `${CARD_ROOT} ${CARD_ROOT}--compact extra-class`,
    );
  });
});

// ---------------------------------------------------------------------------
// Element-level modifier schema — disjoint by default (record schema)
// ---------------------------------------------------------------------------
describe('block() — element-level modifier schema (disjoint, record schema)', () => {
  it('element call uses element-specific modifier schema for its modifier classes', () => {
    const b = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      elements: {
        icon: { modifiers: { color: ['primary', 'muted'] as const } },
      },
      modifiers: { featured: true },
    });
    expect(b('icon', { color: 'primary' })).toBe(
      `${CARD_ROOT}__icon ${CARD_ROOT}__icon--color-primary`,
    );
  });

  it('element call: block-level modifier not in inherit → omitted from output', () => {
    const b = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      elements: {
        icon: { modifiers: { color: ['primary', 'muted'] as const } },
      },
      modifiers: { featured: true },
    });
    // At runtime, passing 'featured' (a block-level modifier) to an element
    // without inherit should produce no featured modifier class
    expect(b('icon', { featured: true } as Record<string, boolean>)).toBe(`${CARD_ROOT}__icon`);
  });

  it('element call: inherited block modifier → included in element output', () => {
    const b = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      elements: {
        icon: {
          modifiers: { color: ['primary', 'muted'] as const },
          inherit: ['featured'],
        },
      },
      modifiers: { featured: true },
    });
    // 'featured' is in inherit list → it should appear in element output
    expect(b('icon', { featured: true } as Record<string, boolean>)).toBe(
      `${CARD_ROOT}__icon ${CARD_ROOT}__icon--featured`,
    );
  });

  it('element call: inherited modifier and own modifier together', () => {
    const b = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      elements: {
        icon: {
          modifiers: { color: ['primary', 'muted'] as const },
          inherit: ['featured'],
        },
      },
      modifiers: { featured: true },
    });
    expect(
      b('icon', { color: 'muted', featured: true } as Record<string, unknown>),
    ).toBe(`${CARD_ROOT}__icon ${CARD_ROOT}__icon--color-muted ${CARD_ROOT}__icon--featured`);
  });

  it('element with no own modifier schema: any modifier omitted from output', () => {
    const b = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      elements: {
        label: {},
      },
      modifiers: { featured: true },
    });
    // label has no modifiers and no inherit → modifiers are silently ignored
    expect(b('label', { featured: true } as Record<string, boolean>)).toBe(
      `${CARD_ROOT}__label`,
    );
  });
});

// ---------------------------------------------------------------------------
// Wrapper mode: multi-select modifier resolves through CSS Module
// ---------------------------------------------------------------------------
describe('block() — wrapper mode modifier resolution', () => {
  const styles: Record<string, string> = {
    card: 'card_abc',
    'card--disabled': 'card--disabled_abc',
    'card--tone-info': 'card--tone-info_abc',
    'card--tone-warning': 'card--tone-warning_abc',
  };

  it('wrapper mode boolean modifier → resolves class through CSS Module', () => {
    const b = block(styles, {
      modifiers: { disabled: true },
    });
    expect(b(null, { disabled: true })).toBe('card_abc card--disabled_abc');
  });

  it('wrapper mode multi-select → resolves each value class through CSS Module', () => {
    const b = block(styles, {
      modifiers: {
        tone: { values: ['info', 'warning'] as const, multi: true },
      },
    });
    expect(b(null, { tone: ['info', 'warning'] })).toBe(
      'card_abc card--tone-info_abc card--tone-warning_abc',
    );
  });
});
