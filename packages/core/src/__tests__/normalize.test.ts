import { describe, expect, it } from 'vitest';
import { hashScope, normalizePath } from '../scope';

describe('normalizePath (CORE-11)', () => {
  it('converts Windows separators and lowercases path', () => {
    expect(normalizePath('src\\components\\Card.ts')).toBe('src/components/card.ts');
  });

  it('converts mixed separators and lowercases path', () => {
    expect(normalizePath('src/components\\Card.ts')).toBe('src/components/card.ts');
  });

  it('keeps posix separators while lowercasing path', () => {
    expect(normalizePath('src/components/Card.ts')).toBe('src/components/card.ts');
  });

  it('produces identical hash input parity across Windows and posix forms', () => {
    expect(hashScope('card', 'src\\Card.ts')).toBe(hashScope('card', 'src/Card.ts'));
  });
});
