import { describe, expect, it } from 'vitest';
import { styles } from '../styles';
import { serialize } from '../serializer';
import { generateTheme } from '../theme';
import { validateTokens } from '../tokens';

describe('styles()', () => {
  it('returns a stylesheet with non-empty css', () => {
    const sheet = styles({ color: 'red' });

    expect(sheet.css.length).toBeGreaterThan(0);
    expect(sheet.css).toContain('color: red;');
  });

  it('wraps css in a layer when layer option is provided', () => {
    const sheet = styles({ color: 'red' }, { layer: 'base' });

    expect(sheet.css).toContain('@layer base');
    expect(sheet.css).toContain('color: red;');
  });

  it('uses provided blockName', () => {
    const sheet = styles({ color: 'red' }, { blockName: 'card' });

    expect(sheet.blockName).toBe('card');
  });

  it('is deterministic for identical input', () => {
    const first = styles({ backgroundColor: 'blue', color: 'red' }, { layer: 'base', blockName: 'card' });
    const second = styles({ backgroundColor: 'blue', color: 'red' }, { layer: 'base', blockName: 'card' });

    expect(first.css).toBe(second.css);
  });

  it('returns a serializable stylesheet object', () => {
    const sheet = styles({ color: 'red' }, { blockName: 'card' });
    const parsed = JSON.parse(JSON.stringify(sheet));

    expect(parsed).toEqual({
      blockName: 'card',
      css: 'color: red;',
      definition: { color: 'red' },
    });
  });

  it('accepts token theme in non-strict mode', () => {
    expect(() =>
      styles({}, { theme: { tokens: { color: 'red', spacingSm: '8px' } } }),
    ).not.toThrow();
  });

  it('throws actionable error for invalid strict token values', () => {
    expect(() =>
      styles({}, { theme: { tokens: { color: 'not-css-token-value@' }, strict: true } }),
    ).toThrow(/color/i);
  });

  it('serializes tokens as css custom properties', () => {
    const sheet = styles(
      { color: 'var(--color)' },
      { theme: { tokens: { color: 'red', spacingSm: '8px' } } },
    );

    expect(sheet.css).toContain('--color: red;');
    expect(sheet.css).toContain('--spacing-sm: 8px;');
    expect(sheet.css).toContain('color: var(--color);');
  });

  it('includes token css before declaration css when theme is present', () => {
    const sheet = styles(
      { color: 'var(--primary)' },
      { theme: { tokens: { primary: '#fff' } } },
    );

    expect(sheet.css.indexOf('--primary: #fff;')).toBeLessThan(sheet.css.indexOf('color: var(--primary);'));
  });

  it('keeps empty definition valid when only theme tokens are provided', () => {
    const sheet = styles({}, { theme: { tokens: { spacingSm: '8px' } } });

    expect(sheet.css).toContain('--spacing-sm: 8px;');
  });

  it('returns anonymous blockName by default', () => {
    const sheet = styles({ color: 'red' });
    expect(sheet.blockName).toBe('anonymous');
  });
});

describe('serialize()', () => {
  it('serializes camelCase declarations to kebab-case', () => {
    const css = serialize({ color: 'red', backgroundColor: 'blue', WebkitTransform: 'scale(1)' });

    expect(css).toContain('color: red;');
    expect(css).toContain('background-color: blue;');
    expect(css).toContain('-webkit-transform: scale(1);');
  });

  it('supports nested ampersand selectors', () => {
    const css = serialize({ '&:hover': { color: 'red' } });

    expect(css).toContain('&:hover { color: red; }');
  });

  it('passes at-rules through as wrapper blocks', () => {
    const css = serialize({ '@media (max-width: 768px)': { display: 'none' } });

    expect(css).toContain('@media (max-width: 768px) { display: none; }');
  });

  it('supports multiple nested blocks in stable order', () => {
    const css = serialize({
      color: 'red',
      '&:hover': { color: 'white' },
      '@media (max-width: 768px)': { display: 'none' },
    });

    expect(css).toContain('color: red;');
    expect(css).toContain('&:hover { color: white; }');
    expect(css).toContain('@media (max-width: 768px) { display: none; }');
  });

  it('is deterministic for identical input', () => {
    const first = serialize({ backgroundColor: 'blue', color: 'red', '&:hover': { color: 'white' } });
    const second = serialize({ backgroundColor: 'blue', color: 'red', '&:hover': { color: 'white' } });

    expect(first).toBe(second);
  });
});

describe('generateTheme()', () => {
  it('generates one :root theme block per theme name', () => {
    const css = generateTheme({
      light: { '--color': 'white' },
      dark: { '--color': 'black' },
    });

    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain(':root[data-theme="light"]');
  });

  it('serializes token values as CSS custom properties', () => {
    const css = generateTheme({
      light: { '--color': 'white', '--spacing-sm': '8px' },
    });

    expect(css).toContain('--color: white;');
    expect(css).toContain('--spacing-sm: 8px;');
  });

  it('validates token values in strict mode', () => {
    expect(() =>
      generateTheme(
        {
          light: { '--color': 'not-css-token-value@' },
        },
        { strict: true },
      ),
    ).toThrow(/invalid token value/i);
  });
});

describe('validateTokens()', () => {
  it('returns token object unchanged in non-strict mode', () => {
    const tokens = { color: 'not a strict value !!!' };
    expect(validateTokens(tokens, false)).toEqual(tokens);
  });

  it('accepts css variable references in strict mode', () => {
    expect(validateTokens({ color: 'var(--brand-color)' }, true)).toEqual({
      color: 'var(--brand-color)',
    });
  });
});
