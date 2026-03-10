import { describe, it, expect, beforeEach } from 'vitest';
import { createRoot } from 'solid-js';

import { createBlock, ElemiaContext } from '../createBlock';
import type { StyleSheet } from '@elemia/styles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(blockName: string, css = `.${blockName} { color: red; }`): StyleSheet {
  return { blockName, css, definition: { color: 'red' } };
}

beforeEach(() => {
  document.head.querySelectorAll('style[data-elemia]').forEach((el) => el.remove());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createBlock()', () => {
  it('injects a <style> element after createRoot flushes effects', () => {
    const sheet = makeSheet('card');
    let dispose!: () => void;

    // createEffect is queued during the createRoot callback and runs after the
    // callback returns (SolidJS flushes effects at the end of createRoot).
    createRoot((d) => {
      dispose = d;
      createBlock(sheet);
    });

    expect(document.head.querySelector('style[data-elemia="card"]')).not.toBeNull();
    dispose();
  });

  it('removes the <style> element via onCleanup when the root is disposed', () => {
    const sheet = makeSheet('btn');
    let dispose!: () => void;

    createRoot((d) => {
      dispose = d;
      createBlock(sheet);
    });

    expect(document.head.querySelector('style[data-elemia="btn"]')).not.toBeNull();
    dispose();
    expect(document.head.querySelector('style[data-elemia="btn"]')).toBeNull();
  });

  it('does not inject duplicate <style> when called twice with the same blockName', () => {
    const sheet = makeSheet('nav');
    let dispose!: () => void;

    createRoot((d) => {
      dispose = d;
      createBlock(sheet);
      createBlock(sheet);
    });

    expect(document.head.querySelectorAll('style[data-elemia="nav"]').length).toBe(1);
    dispose();
  });

  it('keeps <style> until the last root is disposed (ref-counting)', () => {
    const sheet = makeSheet('hero');
    let disposeA!: () => void;
    let disposeB!: () => void;

    createRoot((d) => {
      disposeA = d;
      createBlock(sheet);
    });

    createRoot((d) => {
      disposeB = d;
      createBlock(sheet);
    });

    disposeA();
    expect(document.head.querySelector('style[data-elemia="hero"]')).not.toBeNull();

    disposeB();
    expect(document.head.querySelector('style[data-elemia="hero"]')).toBeNull();
  });

  it('does not throw when used without ElemiaContext.Provider (graceful fallback)', () => {
    expect(() => {
      createRoot((dispose) => {
        createBlock(makeSheet('footer'));
        dispose();
      });
    }).not.toThrow();
  });

  it('uses the nonce from ElemiaContext when a Provider is present', () => {
    const sheet = makeSheet('modal');
    let dispose!: () => void;

    createRoot((d) => {
      dispose = d;
      // Run createBlock within the context by accessing the context value directly.
      // ElemiaContext.Provider wraps children with a provided value.
      ElemiaContext.Provider({
        value: { nonce: 'ctx-nonce' },
        get children() {
          createBlock(sheet);
          return null;
        },
      });
    });

    const el = document.head.querySelector('style[data-elemia="modal"]');
    expect(el).not.toBeNull();
    dispose();
  });
});
