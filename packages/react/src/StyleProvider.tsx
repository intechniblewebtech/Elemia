import { type ReactNode, useMemo, useRef } from 'react';

import { StyleContext } from './context';

export interface StyleProviderProps {
  nonce?: string;
  children: ReactNode;
}

export function StyleProvider({ nonce, children }: StyleProviderProps) {
  const injectedRef = useRef(new Map<string, { count: number; element: HTMLStyleElement }>());
  const ssrBufferRef = useRef(new Map<string, string>());

  const value = useMemo(
    () => ({
      nonce,
      injected: injectedRef.current,
      ssrBuffer: ssrBufferRef.current,
      collectStyle(blockName: string, css: string) {
        ssrBufferRef.current.set(blockName, css);
      },
    }),
    [nonce],
  );

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
}
