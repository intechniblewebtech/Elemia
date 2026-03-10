import { createContext, createEffect, onCleanup, useContext } from 'solid-js';

import type { StyleSheet } from '@elemia/styles';

/** Value shape for the Elemia SolidJS context. */
export interface ElemiaContextValue {
  /** CSP nonce propagated from <ElemiaContext.Provider value={{ nonce }}> */
  nonce?: string;
}

/**
 * SolidJS context for Elemia style injection.
 *
 * Wrap your application with `<ElemiaContext.Provider value={{ nonce }}>` to
 * propagate a CSP nonce to all `createBlock()` calls in the subtree.
 *
 * When no provider is present, `useContext(ElemiaContext)` returns the default
 * value `{}` (nonce: undefined) — styles are injected without a nonce attribute.
 * No error is thrown (graceful fallback).
 */
export const ElemiaContext = createContext<ElemiaContextValue>({});

/** Internal ref-count map keyed by blockName. */
const registry = new Map<string, { count: number; element: HTMLStyleElement }>();

/**
 * SolidJS reactive primitive that mounts a StyleSheet into the DOM.
 *
 * Call this inside a component's setup (top-level of the component function,
 * not inside a callback). It uses `createEffect` to mount the `<style>` element
 * reactively and `onCleanup` to handle unmounting with ref-counting.
 *
 * CSP nonce is read from the nearest `<ElemiaContext.Provider>` ancestor. If no
 * provider is present the style is injected without a nonce (graceful fallback).
 *
 * @param sheet - StyleSheet produced by styles()
 */
export function createBlock(sheet: StyleSheet): void {
  const ctx = useContext(ElemiaContext);

  createEffect(() => {
    const { blockName, css } = sheet;
    const existing = registry.get(blockName);

    if (existing) {
      existing.count += 1;
    } else {
      const el = document.createElement('style');
      el.setAttribute('data-elemia', blockName);
      if (ctx.nonce) {
        el.setAttribute('nonce', ctx.nonce);
      }
      el.textContent = css;
      document.head.appendChild(el);
      registry.set(blockName, { count: 1, element: el });
    }

    onCleanup(() => {
      const entry = registry.get(blockName);
      if (!entry) return;
      entry.count -= 1;
      if (entry.count === 0) {
        entry.element.parentNode?.removeChild(entry.element);
        registry.delete(blockName);
      }
    });
  });
}
