import { inject, onMounted, onUnmounted } from 'vue';

import type { StyleSheet } from '@elemia/styles';

import { ELEMIA_NONCE_KEY } from './StyleProvider';

/** Internal ref-count map keyed by blockName. */
const registry = new Map<string, { count: number; element: HTMLStyleElement }>();

/**
 * Vue composable that mounts a StyleSheet's CSS into the DOM for the lifetime
 * of the calling component.
 *
 * - On `onMounted`: injects a `<style>` element using ref-counting so multiple
 *   components using the same block share one element.
 * - On `onUnmounted`: decrements the ref count and removes the `<style>` element
 *   when the count reaches zero.
 * - CSP nonce: read from the nearest `<StyleProvider>` ancestor via
 *   `inject('elemia:nonce')`. Graceful fallback if no provider is present —
 *   styles are injected without a nonce attribute, no error thrown.
 *
 * @param sheet - StyleSheet produced by styles()
 */
export function useBlock(sheet: StyleSheet): void {
  const nonce = inject<string | null>(ELEMIA_NONCE_KEY, null);

  onMounted(() => {
    const { blockName, css } = sheet;
    const existing = registry.get(blockName);

    if (existing) {
      existing.count += 1;
      return;
    }

    const el = document.createElement('style');
    el.setAttribute('data-elemia', blockName);
    if (nonce) {
      el.setAttribute('nonce', nonce);
    }
    el.textContent = css;
    document.head.appendChild(el);
    registry.set(blockName, { count: 1, element: el });
  });

  onUnmounted(() => {
    const { blockName } = sheet;
    const entry = registry.get(blockName);
    if (!entry) return;

    entry.count -= 1;
    if (entry.count === 0) {
      entry.element.parentNode?.removeChild(entry.element);
      registry.delete(blockName);
    }
  });
}
