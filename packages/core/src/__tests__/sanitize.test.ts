import { describe, it, expect } from 'vitest';
import { sanitizeBlockName } from '../sanitize';

describe('sanitizeBlockName()', () => {
  it('lowercases the input', () => {
    expect(sanitizeBlockName('MyCard')).toBe('mycard');
  });

  it('replaces underscores with hyphens', () => {
    expect(sanitizeBlockName('card_hero')).toBe('card-hero');
  });

  it('replaces double underscores with a single hyphen', () => {
    expect(sanitizeBlockName('card__hero')).toBe('card-hero');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeBlockName('my card')).toBe('my-card');
  });

  it('trims leading and trailing spaces before processing', () => {
    expect(sanitizeBlockName('  my card  ')).toBe('my-card');
  });

  it('strips characters not matching [a-z0-9-]', () => {
    expect(sanitizeBlockName('card@hero!')).toBe('cardhero');
  });

  it('collapses consecutive hyphens to a single hyphen', () => {
    expect(sanitizeBlockName('card---hero')).toBe('card-hero');
  });

  it('trims leading hyphens', () => {
    expect(sanitizeBlockName('-card')).toBe('card');
  });

  it('trims trailing hyphens', () => {
    expect(sanitizeBlockName('card-')).toBe('card');
  });

  it('replaces non-ASCII characters with closest ASCII equivalents', () => {
    expect(sanitizeBlockName('café')).toBe('cafe');
  });

  it('handles mixed non-ASCII + special chars', () => {
    expect(sanitizeBlockName('Ångström')).toBe('angstrom');
  });

  it('throws when the sanitized result is empty', () => {
    expect(() => sanitizeBlockName('')).toThrow(
      "[@elemia/core] Block name '' sanitized to empty string.",
    );
  });

  it('throws when the input consists entirely of stripped characters', () => {
    expect(() => sanitizeBlockName('---')).toThrow(
      "[@elemia/core] Block name '---' sanitized to empty string.",
    );
  });

  it('throws when the input is only special characters', () => {
    expect(() => sanitizeBlockName('!@#$')).toThrow(
      "[@elemia/core] Block name '!@#$' sanitized to empty string.",
    );
  });

  it('preserves numbers in the name', () => {
    expect(sanitizeBlockName('card2')).toBe('card2');
  });

  it('handles an already-valid kebab-case name unchanged', () => {
    expect(sanitizeBlockName('my-card')).toBe('my-card');
  });
});
