import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import { useBlock } from '../useBlock';
import { StyleProvider } from '../StyleProvider';
import type { StyleSheet } from '@elemia/styles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(blockName: string, css = `.${blockName} { color: red; }`): StyleSheet {
  return { blockName, css, definition: { color: 'red' } };
}

function makeComponent(sheet: StyleSheet) {
  return defineComponent({
    setup() {
      useBlock(sheet);
    },
    render() {
      return h('div');
    },
  });
}

beforeEach(() => {
  document.head.querySelectorAll('style[data-elemia]').forEach((el) => el.remove());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBlock()', () => {
  it('injects a <style> element on mount', async () => {
    const sheet = makeSheet('card');
    const Component = makeComponent(sheet);
    mount(Component);
    expect(document.head.querySelector('style[data-elemia="card"]')).not.toBeNull();
  });

  it('removes the <style> element on unmount', async () => {
    const sheet = makeSheet('btn');
    const Component = makeComponent(sheet);
    const wrapper = mount(Component);
    expect(document.head.querySelector('style[data-elemia="btn"]')).not.toBeNull();
    await wrapper.unmount();
    expect(document.head.querySelector('style[data-elemia="btn"]')).toBeNull();
  });

  it('does not inject duplicate <style> for the same blockName', () => {
    const sheet = makeSheet('nav');
    const A = makeComponent(sheet);
    const B = makeComponent(sheet);
    mount(A);
    mount(B);
    expect(document.head.querySelectorAll('style[data-elemia="nav"]').length).toBe(1);
  });

  it('keeps <style> until the last consumer unmounts (ref-counting)', async () => {
    const sheet = makeSheet('hero');
    const A = makeComponent(sheet);
    const B = makeComponent(sheet);
    const wA = mount(A);
    const wB = mount(B);
    await wA.unmount();
    expect(document.head.querySelector('style[data-elemia="hero"]')).not.toBeNull();
    await wB.unmount();
    expect(document.head.querySelector('style[data-elemia="hero"]')).toBeNull();
  });

  it('propagates nonce from StyleProvider via provide/inject', () => {
    const sheet = makeSheet('sidebar');
    const Inner = makeComponent(sheet);
    mount(StyleProvider, {
      props: { nonce: 'test-nonce' },
      slots: { default: () => h(Inner) },
    });
    const el = document.head.querySelector('style[data-elemia="sidebar"]');
    expect(el?.getAttribute('nonce')).toBe('test-nonce');
  });

  it('does not throw when used without StyleProvider (no nonce fallback)', () => {
    const sheet = makeSheet('footer');
    const Component = makeComponent(sheet);
    expect(() => mount(Component)).not.toThrow();
    const el = document.head.querySelector('style[data-elemia="footer"]');
    expect(el).not.toBeNull();
    expect(el?.hasAttribute('nonce')).toBe(false);
  });
});
