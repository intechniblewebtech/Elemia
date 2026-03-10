/**
 * CSP Nonce Strategy for @elemia/react
 * =====================================
 * The nonce must be accessible from useBlock() without requiring it as a
 * per-call argument (which would be an ergonomics burden on every component).
 *
 * Decision: React context (StyleContext) carries the nonce and the shared
 * injection map. StyleProvider (REACT-02) wraps the application and provides
 * this context at the tree root, setting `nonce` and owning the `injected` Map.
 *
 * When no StyleProvider is present, useContext(StyleContext) returns the default
 * context value (nonce: undefined, injected: shared module-level Map). This is
 * the graceful fallback — styles are still injected, just without a `nonce`
 * attribute on the <style> tag. No error is thrown.
 *
 * Ref-counting is stored inside `injected` per blockName so that multiple
 * components using the same block's styles share one <style> element and
 * remove it only when the last consumer unmounts (implemented in REACT-04).
 */

import { createContext } from 'react';

/** Value shape of the Elemia style injection context. */
export interface StyleContextValue {
  /** CSP nonce string propagated from <StyleProvider nonce="...">. */
  nonce: string | undefined;
  /**
   * Ref-counted map of injected <style> elements keyed by blockName.
   * Mutated in place by useBlock (mount) and its cleanup (unmount).
   */
  injected: Map<string, { count: number; element: HTMLStyleElement }>;
  /** SSR-only collection buffer of blockName -> css. */
  ssrBuffer: Map<string, string>;
  /** Collects style css during SSR renders. */
  collectStyle: (blockName: string, css: string) => void;
}

/**
 * Default context value used when no StyleProvider is present.
 * Uses a module-level Map so concurrent hooks without a provider
 * still share ref-counts and avoid duplicate <style> elements.
 */
const defaultInjected = new Map<
  string,
  { count: number; element: HTMLStyleElement }
>();

const defaultSsrBuffer = new Map<string, string>();

export const StyleContext = createContext<StyleContextValue>({
  nonce: undefined,
  injected: defaultInjected,
  ssrBuffer: defaultSsrBuffer,
  collectStyle: () => {
    // No provider: graceful noop fallback.
  },
});
