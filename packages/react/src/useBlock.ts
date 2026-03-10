import { useContext, useEffect } from 'react';

import type { BlockHelper } from '@elemia/core';

import { StyleContext } from './context';
import { inject } from './injector';

function resolveAuthorCss(b: BlockHelper): string | null {
  const candidate = b as unknown as {
    styleSheet?: { css?: string };
    getStyleSheet?: () => { css?: string } | null;
  };

  if (candidate.styleSheet?.css) {
    return candidate.styleSheet.css;
  }

  const fromGetter = candidate.getStyleSheet?.();
  if (fromGetter?.css) {
    return fromGetter.css;
  }

  return null;
}

/**
 * Integrates a BlockHelper with Elemia's React style injection system.
 *
 * - **Wrapper mode** (`b.styles !== null`): passthrough — the CSS Module import
 *   already provides class names; no <style> injection is needed.
 * - **Author mode** (`b.styles === null`): schedules style injection into the
 *   DOM via StyleContext. The nonce (if any) is read from the nearest
 *   StyleProvider ancestor. If no provider is present, styles are injected
 *   without a nonce (graceful fallback — no error is thrown).
 *
 * Full <style> injection and ref-counted cleanup are wired in REACT-04.
 * This hook establishes the context subscription and effect lifecycle.
 *
 * @param b - BlockHelper returned by block()
 * @returns The same BlockHelper (identity — preserves generic type `T`)
 */
export function useBlock<T extends BlockHelper>(b: T): T {
  const ctx = useContext(StyleContext);
  const isAuthorMode = b.styles === null;
  const blockName = b.descriptor.scopedName ?? b.descriptor.name;
  const css = isAuthorMode ? resolveAuthorCss(b) : null;

  if (isAuthorMode) {
    if (css) {
      ctx.collectStyle(blockName, css);
    }
  }

  useEffect(() => {
    if (!isAuthorMode) {
      // Wrapper mode: no injection side-effects.
      return;
    }

    if (!css) {
      return;
    }

    const cleanup = inject({
      blockName,
      css,
      nonce: ctx.nonce,
      injected: ctx.injected,
    });

    return () => {
      cleanup();
    };
  }, [isAuthorMode, blockName, css, ctx]);

  return b;
}
