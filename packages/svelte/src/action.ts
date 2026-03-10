import type { StyleSheet } from '@elemia/styles';

/** Module-level CSP nonce. Set once at app startup via setNonce(). */
let _nonce: string | null = null;

/**
 * Sets the CSP nonce used when injecting `<style>` elements.
 *
 * Call this once during app initialisation before any Svelte component that
 * uses `use:styleAction` is mounted. See README.md for usage details.
 *
 * @param nonce - CSP nonce string from your server response headers
 */
export function setNonce(nonce: string): void {
  _nonce = nonce;
}

/** Internal ref-count map keyed by blockName. */
const registry = new Map<string, { count: number; element: HTMLStyleElement }>();

/**
 * Svelte action that mounts a StyleSheet into the DOM for the lifetime of
 * the element it is applied to.
 *
 * Uses ref-counting so multiple elements using the same block's styles share
 * one `<style>` tag. The element is removed only when all consumers have been
 * destroyed.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { styleAction } from '@elemia/svelte';
 *   import { cardSheet } from './card.styles';
 * </script>
 * <div use:styleAction={cardSheet}>...</div>
 * ```
 *
 * @param _node  - The DOM element the action is applied to (unused)
 * @param sheet  - StyleSheet produced by styles()
 */
export function styleAction(
  _node: Element,
  sheet: StyleSheet,
): { destroy(): void } {
  const { blockName, css } = sheet;
  const existing = registry.get(blockName);

  if (existing) {
    existing.count += 1;
  } else {
    const el = document.createElement('style');
    el.setAttribute('data-elemia', blockName);
    if (_nonce !== null) {
      el.setAttribute('nonce', _nonce);
    }
    el.textContent = css;
    document.head.appendChild(el);
    registry.set(blockName, { count: 1, element: el });
  }

  return {
    destroy(): void {
      const entry = registry.get(blockName);
      if (!entry) return;
      entry.count -= 1;
      if (entry.count === 0) {
        entry.element.parentNode?.removeChild(entry.element);
        registry.delete(blockName);
      }
    },
  };
}
