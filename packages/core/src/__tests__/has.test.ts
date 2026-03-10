import { describe, it, expect } from 'vitest';
import { block } from '../block';

// ---------------------------------------------------------------------------
// CORE-05: b.has() — runtime guard for safe partial migration
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fixture styles objects
// ---------------------------------------------------------------------------
const cardStyles: Record<string, string> = {
  card: 'card_abc123',
  'card__thumbnail': 'card__thumbnail_abc123',
  'card__thumbnail--active': 'card__thumbnail--active_abc123',
  'card__thumbnail--size-lg': 'card__thumbnail--size-lg_abc123',
  'card__header': 'card__header_abc123',
  'card--compact': 'card--compact_abc123',
};

// ---------------------------------------------------------------------------
// Wrapper mode — element-only checks
// ---------------------------------------------------------------------------
describe('b.has() — wrapper mode, element-only', () => {
  const b = block(cardStyles, {
    elements: ['thumbnail', 'header'] as const,
  });

  it('returns true when the element class exists in styles', () => {
    expect(b.has('thumbnail')).toBe(true);
  });

  it('returns true for another existing element', () => {
    expect(b.has('header')).toBe(true);
  });

  it('returns false when the element class does not exist in styles', () => {
    expect(b.has('nonexistent')).toBe(false);
  });

  it('returns false for an element not in the styles object even if plausible', () => {
    expect(b.has('footer')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Wrapper mode — modifier checks (element + modifier)
// ---------------------------------------------------------------------------
describe('b.has() — wrapper mode, element + modifier', () => {
  const b = block(cardStyles, {
    elements: ['thumbnail'] as const,
  });

  it('returns true when the element + boolean modifier key exists in styles', () => {
    expect(b.has('thumbnail', 'active')).toBe(true);
  });

  it('returns false when the element + modifier key does not exist in styles', () => {
    expect(b.has('thumbnail', 'missing')).toBe(false);
  });

  it('returns false for a nonexistent element with a modifier', () => {
    expect(b.has('nonexistent', 'active')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Wrapper mode — modifier + value checks (element + modifier + value)
// ---------------------------------------------------------------------------
describe('b.has() — wrapper mode, element + modifier + value', () => {
  const b = block(cardStyles, {
    elements: ['thumbnail'] as const,
  });

  it('returns true when element + modifier-value key exists in styles', () => {
    expect(b.has('thumbnail', 'size', 'lg')).toBe(true);
  });

  it('returns false when element + modifier-value key does not exist in styles', () => {
    expect(b.has('thumbnail', 'size', 'sm')).toBe(false);
  });

  it('returns false for modifier-value on nonexistent element', () => {
    expect(b.has('nonexistent', 'size', 'lg')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Author mode — always returns false
// ---------------------------------------------------------------------------
describe('b.has() — author mode', () => {
  const b = block('card', {
    elements: ['thumbnail', 'header'] as const,
    modifiers: { compact: true } as const,
  });

  it('returns false for an element defined in the schema', () => {
    expect(b.has('thumbnail')).toBe(false);
  });

  it('returns false for another element in the schema', () => {
    expect(b.has('header')).toBe(false);
  });

  it('returns false for a nonexistent element', () => {
    expect(b.has('nonexistent')).toBe(false);
  });

  it('returns false even with modifier argument', () => {
    expect(b.has('thumbnail', 'active')).toBe(false);
  });

  it('returns false even with modifier + value arguments', () => {
    expect(b.has('thumbnail', 'size', 'lg')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Does not throw — safe null-check guard
// ---------------------------------------------------------------------------
describe('b.has() — does not throw', () => {
  const wrapperB = block(cardStyles, {});
  const authorB = block('card');

  it('does not throw for nonexistent element in wrapper mode', () => {
    expect(() => wrapperB.has('doesNotExist')).not.toThrow();
  });

  it('does not throw for nonexistent element in author mode', () => {
    expect(() => authorB.has('doesNotExist')).not.toThrow();
  });

  it('does not throw for nonexistent modifier in wrapper mode', () => {
    expect(() => wrapperB.has('thumbnail', 'doesNotExist')).not.toThrow();
  });

  it('does not throw for nonexistent modifier+value in wrapper mode', () => {
    expect(() => wrapperB.has('thumbnail', 'doesNotExist', 'nope')).not.toThrow();
  });
});
