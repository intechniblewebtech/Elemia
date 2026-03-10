import type { StyleSheet } from '@elemia/styles';

/** Options for the mount() function. */
export interface MountOptions {
  /** Target element to inject <style> into. Defaults to document.head. */
  target?: Element;
  /** CSP nonce attribute value for the injected <style> tag. */
  nonce?: string;
}

/** Internal ref-count entry. */
interface RefEntry {
  count: number;
  element: HTMLStyleElement;
}

/** Module-level ref-count map shared across all mount() callers. */
const registry = new Map<string, RefEntry>();

/**
 * Mounts a StyleSheet into the DOM as a <style> element.
 *
 * Uses ref-counting keyed by `sheet.blockName` so multiple callers mounting
 * the same block's styles share one <style> tag. The element is removed only
 * when every caller has called the returned unmount function.
 *
 * @param sheet   - The StyleSheet produced by styles()
 * @param options - Optional target element and CSP nonce
 * @returns An unmount function that decrements the ref count (and removes the
 *          <style> element when the count reaches zero).
 */
export function mount(sheet: StyleSheet, options: MountOptions = {}): () => void {
  const { target = document.head, nonce } = options;
  const { blockName, css } = sheet;

  const existing = registry.get(blockName);
  if (existing) {
    existing.count += 1;
  } else {
    const el = document.createElement('style');
    el.setAttribute('data-elemia', blockName);
    if (nonce !== undefined) {
      el.setAttribute('nonce', nonce);
    }
    el.textContent = css;
    target.appendChild(el);
    registry.set(blockName, { count: 1, element: el });
  }

  return function unmount(): void {
    const entry = registry.get(blockName);
    if (!entry) return;
    entry.count -= 1;
    if (entry.count === 0) {
      entry.element.parentNode?.removeChild(entry.element);
      registry.delete(blockName);
    }
  };
}
