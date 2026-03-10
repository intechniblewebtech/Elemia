import { describe, it, expect, afterEach } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { Fragment } from 'react';

import type { BlockDescriptor, BlockHelper } from '@elemia/core';

import { ServerStyles } from '../../ServerStyles';
import { StyleProvider } from '../../StyleProvider';
import { useBlock } from '../../useBlock';

function makeDescriptor(mode: 'wrapper' | 'author', name = 'card'): BlockDescriptor {
  return {
    name,
    mode,
    scopedName: mode === 'author' ? `${name}_scope` : null,
    elements: [],
    modifiers: {},
  };
}

function makeBlockHelper(mode: 'wrapper' | 'author', name = 'card', css = '.card_scope { color: red; }'): BlockHelper {
  const styles: Record<string, string> | null =
    mode === 'wrapper' ? { root: `${name}_root`, title: `${name}_title` } : null;

  return Object.assign(
    function () {
      return '';
    },
    {
      styles,
      descriptor: makeDescriptor(mode, name),
      root: () => '',
      has: () => false,
      ...(mode === 'author' ? { styleSheet: { css } } : {}),
    },
  ) as unknown as BlockHelper;
}

function readInjectedOrder(): string[] {
  return Array.from(document.querySelectorAll<HTMLStyleElement>('style[data-elemia-block]')).map(
    (node) => node.getAttribute('data-elemia-block') ?? '',
  );
}

afterEach(() => {
  document.head.innerHTML = '';
});

describe('react adapter integration', () => {
  it('wrapper mode keeps helper identity and does not inject DOM styles', () => {
    const wrapper = makeBlockHelper('wrapper', 'button');
    const before = document.querySelectorAll('style[data-elemia-block]').length;

    const { result } = renderHook(() => useBlock(wrapper));

    expect(result.current).toBe(wrapper);
    expect(document.querySelectorAll('style[data-elemia-block]').length).toBe(before);
  });

  it('author mode injects on mount and removes on unmount', () => {
    const author = makeBlockHelper('author', 'alert', '.alert_scope { color: orange; }');

    function UsesAuthor() {
      useBlock(author);
      return null;
    }

    const app = render(
      <StyleProvider>
        <UsesAuthor />
      </StyleProvider>,
    );

    expect(document.querySelector('style[data-elemia-block="alert_scope"]')).not.toBeNull();

    app.unmount();

    expect(document.querySelector('style[data-elemia-block="alert_scope"]')).toBeNull();
  });

  it('propagates nonce from provider to injected style tags', () => {
    const author = makeBlockHelper('author', 'card', '.card_scope { display: block; }');

    function UsesAuthor() {
      useBlock(author);
      return null;
    }

    render(
      <StyleProvider nonce="nonce-123">
        <UsesAuthor />
      </StyleProvider>,
    );

    const style = document.querySelector('style[data-elemia-block="card_scope"]');
    expect(style?.getAttribute('nonce')).toBe('nonce-123');
  });

  it('keeps injected style tags in alphabetical order', () => {
    const zBlock = makeBlockHelper('author', 'zebra', '.zebra_scope { }');
    const aBlock = makeBlockHelper('author', 'alert', '.alert_scope { }');
    const mBlock = makeBlockHelper('author', 'modal', '.modal_scope { }');

    function UsesAll() {
      useBlock(zBlock);
      useBlock(aBlock);
      useBlock(mBlock);
      return null;
    }

    render(
      <StyleProvider>
        <UsesAll />
      </StyleProvider>,
    );

    expect(readInjectedOrder()).toEqual(['alert_scope', 'modal_scope', 'zebra_scope']);
  });

  it('StyleProvider + ServerStyles emits collected style tags in sorted order', () => {
    const bBlock = makeBlockHelper('author', 'button', '.button_scope { color: blue; }');
    const aBlock = makeBlockHelper('author', 'alert', '.alert_scope { color: red; }');

    function UsesStyles() {
      useBlock(bBlock);
      useBlock(aBlock);
      return (
        <Fragment>
          <div>content</div>
          <ServerStyles />
        </Fragment>
      );
    }

    const { container } = render(
      <StyleProvider nonce="server-nonce">
        <UsesStyles />
      </StyleProvider>
    );

    const html = container.innerHTML;
    expect(html).toContain('data-elemia-block="alert_scope"');
    expect(html).toContain('data-elemia-block="button_scope"');
    expect(html).toContain('nonce="server-nonce"');

    const alertIndex = html.indexOf('data-elemia-block="alert_scope"');
    const buttonIndex = html.indexOf('data-elemia-block="button_scope"');
    expect(alertIndex).toBeLessThan(buttonIndex);
  });

  it('ServerStyles renders without client hook usage requirements', () => {
    const { container } = render(
      <StyleProvider>
        <ServerStyles />
      </StyleProvider>
    );

    const html = container.innerHTML;
    expect(typeof html).toBe('string');
  });
});
