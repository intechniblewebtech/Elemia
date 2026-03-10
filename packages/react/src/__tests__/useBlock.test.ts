import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { BlockHelper, BlockDescriptor } from '@elemia/core';

import { useBlock } from '../useBlock';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeDescriptor(
  mode: 'wrapper' | 'author',
  name = 'card',
): BlockDescriptor {
  return {
    name,
    mode,
    scopedName: mode === 'author' ? `${name}_abc123` : null,
    elements: [],
    modifiers: {},
  };
}

function makeBlockHelper(mode: 'wrapper' | 'author', name = 'card'): BlockHelper {
  const styles: Record<string, string> | null =
    mode === 'wrapper' ? { root: 'card_root', title: 'card_title' } : null;

  const b = Object.assign(
    function () {
      return '';
    },
    {
      styles,
      descriptor: makeDescriptor(mode, name),
      root: () => '',
      has: () => false,
    },
  ) as unknown as BlockHelper;

  return b;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBlock()', () => {
  it('wrapper mode: returns the same BlockHelper reference unchanged', () => {
    const b = makeBlockHelper('wrapper');
    const { result } = renderHook(() => useBlock(b));
    expect(result.current).toBe(b);
  });

  it('wrapper mode: no side effects (styles is not null, passthrough)', () => {
    const b = makeBlockHelper('wrapper');
    renderHook(() => useBlock(b));
    // b.styles should remain untouched
    expect(b.styles).not.toBeNull();
  });

  it('author mode without StyleProvider: does not throw', () => {
    const b = makeBlockHelper('author');
    expect(() => renderHook(() => useBlock(b))).not.toThrow();
  });

  it('author mode: returns the same BlockHelper reference', () => {
    const b = makeBlockHelper('author');
    const { result } = renderHook(() => useBlock(b));
    expect(result.current).toBe(b);
  });

  it('BlockHelper.descriptor is accessible after useBlock()', () => {
    const b = makeBlockHelper('wrapper');
    const { result } = renderHook(() => useBlock(b));
    expect(result.current.descriptor.name).toBe('card');
    expect(result.current.descriptor.mode).toBe('wrapper');
  });

  it('author mode: descriptor is accessible after useBlock()', () => {
    const b = makeBlockHelper('author');
    const { result } = renderHook(() => useBlock(b));
    expect(result.current.descriptor.mode).toBe('author');
    expect(result.current.descriptor.scopedName).toBe('card_abc123');
  });
});
