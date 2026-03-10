import { afterEach, describe, expect, it, vi } from 'vitest';
import { block } from '../block';
import { hashScope } from '../scope';

describe('block() — scope injection contract (CORE-07)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses __filePath and __salt when provided for deterministic author scope', () => {
    const b = block('card', { __filePath: 'src/Card.ts', __salt: 'proj' });
    const expected = hashScope('card', 'src/Card.ts', 'proj');

    expect(b(null)).toBe(expected);
    expect(b(null)).toBe(expected);
  });

  it('warns when __filePath is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const b = block('card');
    expect(b(null)).toMatch(/^card_[0-9a-z]{6}$/);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("[@elemia/core] block('card') has no __filePath");
    expect(warnSpy.mock.calls[0]?.[0]).toContain('@elemia/plugin-vite');
  });

  it('does not warn when __filePath is provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    block('card', { __filePath: 'src/Card.ts' });

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
