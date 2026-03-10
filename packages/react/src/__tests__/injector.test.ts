import { describe, expect, it } from 'vitest';

import { inject } from '../injector';

describe('injector', () => {
  it('injects one style tag on first mount', () => {
    const injected = new Map<string, { count: number; element: HTMLStyleElement }>();

    const cleanup = inject({
      blockName: 'card_scope',
      css: '.card_scope { color: red; }',
      nonce: undefined,
      injected,
    });

    expect(document.querySelectorAll('style[data-elemia-block="card_scope"]')).toHaveLength(1);
    cleanup();
  });

  it('increments ref-count and avoids duplicate style tags', () => {
    const injected = new Map<string, { count: number; element: HTMLStyleElement }>();

    const cleanupA = inject({
      blockName: 'card_scope',
      css: '.card_scope { color: red; }',
      nonce: undefined,
      injected,
    });

    const cleanupB = inject({
      blockName: 'card_scope',
      css: '.card_scope { color: red; }',
      nonce: undefined,
      injected,
    });

    expect(document.querySelectorAll('style[data-elemia-block="card_scope"]')).toHaveLength(1);
    expect(injected.get('card_scope')?.count).toBe(2);

    cleanupA();
    expect(document.querySelectorAll('style[data-elemia-block="card_scope"]')).toHaveLength(1);
    expect(injected.get('card_scope')?.count).toBe(1);

    cleanupB();
    expect(document.querySelectorAll('style[data-elemia-block="card_scope"]')).toHaveLength(0);
    expect(injected.has('card_scope')).toBe(false);
  });

  it('applies nonce when provided', () => {
    const injected = new Map<string, { count: number; element: HTMLStyleElement }>();

    const cleanup = inject({
      blockName: 'nonce_scope',
      css: '.nonce_scope { color: red; }',
      nonce: 'abc123',
      injected,
    });

    const style = document.querySelector('style[data-elemia-block="nonce_scope"]');
    expect(style?.getAttribute('nonce')).toBe('abc123');

    cleanup();
  });

  it('removes style tag when last consumer unmounts', () => {
    const injected = new Map<string, { count: number; element: HTMLStyleElement }>();

    const cleanup = inject({
      blockName: 'only_scope',
      css: '.only_scope { color: red; }',
      nonce: undefined,
      injected,
    });

    expect(document.querySelector('style[data-elemia-block="only_scope"]')).not.toBeNull();

    cleanup();

    expect(document.querySelector('style[data-elemia-block="only_scope"]')).toBeNull();
  });
});
