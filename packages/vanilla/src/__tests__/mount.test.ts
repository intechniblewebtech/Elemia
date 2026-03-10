import { describe, it, expect, beforeEach } from 'vitest';

import { mount } from '../mount';
import type { StyleSheet } from '@elemia/styles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(blockName: string, css = `.${blockName} { color: red; }`): StyleSheet {
  return {
    blockName,
    css,
    definition: { color: 'red' },
  };
}

beforeEach(() => {
  // Clean up any <style> elements injected by previous tests.
  document.head.querySelectorAll('style[data-elemia]').forEach((el) => el.remove());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mount()', () => {
  it('injects a <style> element into document.head', () => {
    const sheet = makeSheet('card');
    const unmount = mount(sheet);

    const el = document.head.querySelector('style[data-elemia="card"]');
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('.card');

    unmount();
  });

  it('sets the nonce attribute when provided', () => {
    const sheet = makeSheet('btn');
    const unmount = mount(sheet, { nonce: 'abc123' });

    const el = document.head.querySelector('style[data-elemia="btn"]');
    expect(el?.getAttribute('nonce')).toBe('abc123');

    unmount();
  });

  it('does NOT inject a duplicate <style> on a second mount with the same blockName', () => {
    const sheet = makeSheet('nav');
    const unmount1 = mount(sheet);
    const unmount2 = mount(sheet);

    const elements = document.head.querySelectorAll('style[data-elemia="nav"]');
    expect(elements.length).toBe(1);

    unmount1();
    unmount2();
  });

  it('removes the <style> element only when the last caller unmounts (ref count = 0)', () => {
    const sheet = makeSheet('hero');
    const unmount1 = mount(sheet);
    const unmount2 = mount(sheet);

    unmount1();
    // Still mounted — second caller has not unmounted
    expect(document.head.querySelector('style[data-elemia="hero"]')).not.toBeNull();

    unmount2();
    // Now both have unmounted — element should be removed
    expect(document.head.querySelector('style[data-elemia="hero"]')).toBeNull();
  });

  it('injects into a custom target element when target option is provided', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const sheet = makeSheet('sidebar');
    const unmount = mount(sheet, { target: container });

    expect(container.querySelector('style[data-elemia="sidebar"]')).not.toBeNull();
    expect(document.head.querySelector('style[data-elemia="sidebar"]')).toBeNull();

    unmount();
    container.remove();
  });

  it('is a no-op if unmount is called after the element is already removed', () => {
    const sheet = makeSheet('footer');
    const unmount = mount(sheet);
    unmount();
    // Calling unmount a second time should not throw
    expect(() => unmount()).not.toThrow();
  });
});
