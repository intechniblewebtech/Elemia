import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useContext } from 'react';

import type { BlockDescriptor, BlockHelper } from '@elemia/core';

import { StyleContext } from '../context';
import { StyleProvider } from '../StyleProvider';
import { useBlock } from '../useBlock';

function makeAuthorBlock(name = 'card', css = '.card_scope { color: red; }'): BlockHelper {
  const descriptor: BlockDescriptor = {
    name,
    mode: 'author',
    scopedName: `${name}_scope`,
    elements: [],
    modifiers: {},
  };

  return Object.assign(
    function () {
      return '';
    },
    {
      styles: null,
      descriptor,
      root: () => '',
      has: () => false,
      styleSheet: { css },
    },
  ) as unknown as BlockHelper;
}

describe('StyleProvider', () => {
  it('propagates nonce through StyleContext', () => {
    let seenNonce: string | undefined;

    function Probe() {
      seenNonce = useContext(StyleContext).nonce;
      return null;
    }

    render(
      <StyleProvider nonce="abc123">
        <Probe />
      </StyleProvider>,
    );

    expect(seenNonce).toBe('abc123');
  });

  it('collects styles into SSR buffer in SSR mode', () => {
    let collectedCss = '';

    function Probe() {
      const ctx = useContext(StyleContext);
      collectedCss = ctx.ssrBuffer.get('card_scope') ?? '';
      return null;
    }

    function UsesBlock() {
      useBlock(makeAuthorBlock('card', '.card_scope { color: red; }'));
      return null;
    }

    render(
      <StyleProvider>
        <UsesBlock />
        <Probe />
      </StyleProvider>,
    );

    expect(collectedCss).toContain('color: red;');
  });

  it('nested providers override nonce for inner subtree', () => {
    let outerNonce: string | undefined;
    let innerNonce: string | undefined;

    function OuterProbe() {
      outerNonce = useContext(StyleContext).nonce;
      return null;
    }

    function InnerProbe() {
      innerNonce = useContext(StyleContext).nonce;
      return null;
    }

    render(
      <StyleProvider nonce="outer">
        <OuterProbe />
        <StyleProvider nonce="inner">
          <InnerProbe />
        </StyleProvider>
      </StyleProvider>,
    );

    expect(outerNonce).toBe('outer');
    expect(innerNonce).toBe('inner');
  });
});
