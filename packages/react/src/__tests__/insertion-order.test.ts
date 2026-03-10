import { afterEach, describe, expect, it } from 'vitest';

import { inject } from '../injector';

afterEach(() => {
  document.head.innerHTML = '';
});

function createInjectedMap(): Map<string, { count: number; element: HTMLStyleElement }> {
  return new Map<string, { count: number; element: HTMLStyleElement }>();
}

function readOrder(): string[] {
  return Array.from(document.querySelectorAll<HTMLStyleElement>('style[data-elemia-block]'))
    .map((node) => node.getAttribute('data-elemia-block') ?? '');
}

describe('deterministic insertion order', () => {
  it('keeps style tags alphabetically ordered by block name', () => {
    const injected = createInjectedMap();

    const disposeB = inject({ blockName: 'button_scope', css: '.button { }', nonce: undefined, injected });
    const disposeA = inject({ blockName: 'alert_scope', css: '.alert { }', nonce: undefined, injected });
    const disposeC = inject({ blockName: 'card_scope', css: '.card { }', nonce: undefined, injected });

    expect(readOrder()).toEqual(['alert_scope', 'button_scope', 'card_scope']);

    disposeB();
    disposeA();
    disposeC();
  });

  it('inserts new blocks in-position instead of always appending', () => {
    const injected = createInjectedMap();

    const disposeA = inject({ blockName: 'alpha_scope', css: '.alpha { }', nonce: undefined, injected });
    const disposeC = inject({ blockName: 'charlie_scope', css: '.charlie { }', nonce: undefined, injected });
    const disposeB = inject({ blockName: 'bravo_scope', css: '.bravo { }', nonce: undefined, injected });

    expect(readOrder()).toEqual(['alpha_scope', 'bravo_scope', 'charlie_scope']);

    disposeA();
    disposeB();
    disposeC();
  });

  it('adds data-elemia-block on every injected style tag', () => {
    const injected = createInjectedMap();

    const dispose = inject({ blockName: 'has_attribute', css: '.x { }', nonce: undefined, injected });

    const style = document.querySelector('style[data-elemia-block="has_attribute"]');
    expect(style).not.toBeNull();

    dispose();
  });
});
