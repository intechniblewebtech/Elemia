import { describe, expect, it } from 'vitest';

import { serialize } from '../serializer';

describe('serializer edge cases', () => {
  it('serializes empty objects to empty string', () => {
    expect(serialize({})).toBe('');
  });

  it('sorts declarations alphabetically for deterministic output', () => {
    const css = serialize({ zIndex: 3, color: 'red', alignItems: 'center' });

    expect(css).toBe('align-items: center; color: red; z-index: 3;');
  });

  it('serializes vendor-prefixed properties', () => {
    const css = serialize({ WebkitTransform: 'scale(1)', msTransition: 'all .2s' });

    expect(css).toContain('-webkit-transform: scale(1);');
    expect(css).toContain('-ms-transition: all .2s;');
  });

  it('serializes nested selectors recursively', () => {
    const css = serialize({
      '&:hover': {
        color: 'red',
        '& .child': {
          display: 'block',
        },
      },
    });

    expect(css).toContain('&:hover { color: red; & .child { display: block; } }');
  });

  it('serializes multiple at-rules in deterministic order', () => {
    const css = serialize({
      '@media (min-width: 768px)': { display: 'grid' },
      '@supports (display: grid)': { display: 'grid' },
    });

    expect(css).toBe(
      '@media (min-width: 768px) { display: grid; } @supports (display: grid) { display: grid; }',
    );
  });

  it('handles mixed declarations and nested blocks', () => {
    const css = serialize({
      color: 'red',
      '&:focus': { outline: '2px solid blue' },
      '@media (max-width: 600px)': { color: 'blue' },
    });

    expect(css).toContain('color: red;');
    expect(css).toContain('&:focus { outline: 2px solid blue; }');
    expect(css).toContain('@media (max-width: 600px) { color: blue; }');
  });
});
