import { describe, expect, it } from 'vitest';

import { generateTheme } from '../theme';

describe('generateTheme()', () => {
  it('renders one root block per theme', () => {
    const css = generateTheme({
      light: { '--bg': 'white' },
      dark: { '--bg': 'black' },
      hc: { '--bg': 'yellow' },
    });

    expect(css).toContain(':root[data-theme="light"]');
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain(':root[data-theme="hc"]');
  });

  it('sorts theme names for deterministic output', () => {
    const css = generateTheme({
      zebra: { '--color': 'black' },
      alpha: { '--color': 'white' },
    });

    expect(css.indexOf('data-theme="alpha"')).toBeLessThan(css.indexOf('data-theme="zebra"'));
  });

  it('escapes quotes in theme names', () => {
    const css = generateTheme({
      'dark"alt': { '--bg': 'black' },
    });

    expect(css).toContain(':root[data-theme="dark\\"alt"]');
  });

  it('validates tokens in strict mode', () => {
    expect(() =>
      generateTheme(
        {
          light: { '--bg': 'not@token' },
        },
        { strict: true },
      ),
    ).toThrow(/invalid token value/i);
  });

  it('accepts css variable references in strict mode', () => {
    expect(() =>
      generateTheme(
        {
          light: { '--bg': 'var(--surface-bg)' },
        },
        { strict: true },
      ),
    ).not.toThrow();
  });

  it('serializes custom properties inside each theme block', () => {
    const css = generateTheme({
      light: { '--spacing-sm': '8px', '--radius': '4px' },
    });

    expect(css).toContain('--spacing-sm: 8px;');
    expect(css).toContain('--radius: 4px;');
  });
});
