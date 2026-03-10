export interface ResolverMissPayload {
  file: string;
  blockName: string;
  attemptedKeys: string[];
  availableKeys: string[];
  namingSuggestion?: string;
}

interface ViteDevServerLike {
  ws?: {
    send: (payload: {
      type: 'error';
      err: {
        message: string;
        stack: string;
      };
    }) => void;
  };
}

function formatList(title: string, values: string[]): string {
  const lines = values.length > 0 ? values.map((value) => `  - ${value}`) : ['  - (none)'];
  return [title, ...lines].join('\n');
}

export function createResolverOverlayMessage(payload: ResolverMissPayload): string {
  const hint = payload.namingSuggestion
    ? `Suggested naming option: ${payload.namingSuggestion}`
    : 'Suggested naming option: auto';

  return [
    `[Elemia] Resolver miss in ${payload.file}`,
    `Block: ${payload.blockName}`,
    formatList('Attempted keys:', payload.attemptedKeys),
    formatList('Available keys:', payload.availableKeys),
    hint,
  ].join('\n');
}

export function sendResolverOverlay(server: ViteDevServerLike | null, payload: ResolverMissPayload): void {
  if (!server?.ws) {
    return;
  }

  const message = createResolverOverlayMessage(payload);
  server.ws.send({
    type: 'error',
    err: {
      message,
      stack: message,
    },
  });
}
