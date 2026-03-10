import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { styleAction, setNonce } from '../action';
import type { StyleSheet } from '@elemia/styles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(blockName: string, css = `.${blockName} { color: red; }`): StyleSheet {
  return { blockName, css, definition: { color: 'red' } };
}

// A minimal DOM element to bind the action to.
const node = document.createElement('div');

beforeEach(() => {
  document.head.querySelectorAll('style[data-elemia]').forEach((el) => el.remove());
  // Reset module-level nonce between tests by setting to empty string, then null via cast.
  // setNonce only accepts string, so we reset via re-export's closure — set to empty string.
  setNonce('');
});

afterEach(() => {
  document.head.querySelectorAll('style[data-elemia]').forEach((el) => el.remove());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('styleAction()', () => {
  it('injects a <style> element into document.head on init', () => {
    const sheet = makeSheet('card');
    const action = styleAction(node, sheet);

    expect(document.head.querySelector('style[data-elemia="card"]')).not.toBeNull();
    action.destroy();
  });

  it('sets CSS content on the injected <style> element', () => {
    const sheet = makeSheet('btn', '.btn { display: inline-flex; }');
    const action = styleAction(node, sheet);

    const el = document.head.querySelector('style[data-elemia="btn"]');
    expect(el?.textContent).toBe('.btn { display: inline-flex; }');
    action.destroy();
  });

  it('removes the <style> element on destroy', () => {
    const sheet = makeSheet('nav');
    const action = styleAction(node, sheet);
    action.destroy();

    expect(document.head.querySelector('style[data-elemia="nav"]')).toBeNull();
  });

  it('does not inject duplicate <style> on second mount with same blockName', () => {
    const sheet = makeSheet('hero');
    const a1 = styleAction(node, sheet);
    const a2 = styleAction(node, sheet);

    expect(document.head.querySelectorAll('style[data-elemia="hero"]').length).toBe(1);
    a1.destroy();
    a2.destroy();
  });

  it('keeps <style> until the last caller destroys it (ref-counting)', () => {
    const sheet = makeSheet('sidebar');
    const a1 = styleAction(node, sheet);
    const a2 = styleAction(node, sheet);

    a1.destroy();
    expect(document.head.querySelector('style[data-elemia="sidebar"]')).not.toBeNull();

    a2.destroy();
    expect(document.head.querySelector('style[data-elemia="sidebar"]')).toBeNull();
  });

  it('uses the nonce set via setNonce()', () => {
    setNonce('my-nonce-123');
    const sheet = makeSheet('modal');
    const action = styleAction(node, sheet);

    const el = document.head.querySelector('style[data-elemia="modal"]');
    expect(el?.getAttribute('nonce')).toBe('my-nonce-123');
    action.destroy();
  });

  it('does not set nonce attribute when setNonce was not called', () => {
    // nonce is reset to '' in beforeEach — empty string is falsy for our check
    const sheet = makeSheet('footer');
    const action = styleAction(node, sheet);

    const el = document.head.querySelector('style[data-elemia="footer"]');
    expect(el?.getAttribute('nonce')).toBeFalsy();
    action.destroy();
  });
});
