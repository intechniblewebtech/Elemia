import type { StyleContextValue } from './context';

export interface InjectInput {
  blockName: string;
  css: string;
  nonce: string | undefined;
  injected: StyleContextValue['injected'];
}

function createStyleElement(blockName: string, css: string, nonce?: string): HTMLStyleElement {
  const element = document.createElement('style');
  element.setAttribute('data-elemia-block', blockName);
  if (nonce) {
    element.setAttribute('nonce', nonce);
  }
  element.textContent = css;
  return element;
}

function insertInAlphabeticalOrder(parent: HTMLElement, element: HTMLStyleElement, blockName: string): void {
  const existing = Array.from(parent.querySelectorAll<HTMLStyleElement>('style[data-elemia-block]'));
  const insertBefore = existing.find((candidate) => {
    const existingName = candidate.getAttribute('data-elemia-block') ?? '';
    return existingName.localeCompare(blockName) > 0;
  });

  if (insertBefore) {
    parent.insertBefore(element, insertBefore);
    return;
  }

  parent.appendChild(element);
}

/**
 * Injects an Elemia style block into the DOM with ref-counting.
 * Returns a cleanup function that decrements the count and removes the
 * style element when there are no remaining consumers.
 */
export function inject({ blockName, css, nonce, injected }: InjectInput): () => void {
  if (typeof document === 'undefined') {
    return () => {
      // SSR: no DOM side effects.
    };
  }

  const existing = injected.get(blockName);
  if (existing) {
    existing.count += 1;
    return () => {
      const current = injected.get(blockName);
      if (!current) {
        return;
      }

      current.count -= 1;
      if (current.count <= 0) {
        current.element.remove();
        injected.delete(blockName);
      }
    };
  }

  const element = createStyleElement(blockName, css, nonce);
  insertInAlphabeticalOrder(document.head ?? document.documentElement, element, blockName);
  injected.set(blockName, { count: 1, element });

  return () => {
    const current = injected.get(blockName);
    if (!current) {
      return;
    }

    current.count -= 1;
    if (current.count <= 0) {
      current.element.remove();
      injected.delete(blockName);
    }
  };
}
