import { describe, it, expect, vi } from 'vitest';

import { findCallSites } from '../traverse';
import { injectFilePath } from '../inject';
import { extractStyles } from '../extract';
import { createResolverOverlayMessage, sendResolverOverlay } from '../overlay';
import { elemia } from '../index';

describe('findCallSites()', () => {
  it('returns empty array for source with no Elemia calls', () => {
    const source = `const x = foo(1, 2); bar('hello');`;
    expect(findCallSites(source, 'test.js')).toEqual([]);
  });

  it('detects a single block() call and returns one CallSite', () => {
    const source = `const b = block('card', { elements: ['title'] });`;
    const sites = findCallSites(source, 'Card.js');
    expect(sites).toHaveLength(1);
    expect(sites[0].callName).toBe('block');
    expect(sites[0].args[0]).toBe("'card'");
  });

  it('detects a single styles() call and returns one CallSite', () => {
    const source = `const sheet = styles({ color: 'red' });`;
    const sites = findCallSites(source, 'card.styles.js');
    expect(sites).toHaveLength(1);
    expect(sites[0].callName).toBe('styles');
  });

  it('detects multiple styles() calls and returns correct count', () => {
    const source = [
      `const a = styles({ color: 'red' });`,
      `const b = styles({ display: 'flex' });`,
      `const c = styles({ margin: '0' });`,
    ].join('\n');
    const sites = findCallSites(source, 'multi.js');
    expect(sites.filter((s) => s.callName === 'styles')).toHaveLength(3);
  });

  it('returns correct line numbers for each call site', () => {
    const source = [`const a = block('nav', {});`, `const b = styles({ color: 'blue' });`].join(
      '\n',
    );
    const sites = findCallSites(source, 'test.js');
    expect(sites).toHaveLength(2);
    expect(sites[0].line).toBe(1);
    expect(sites[1].line).toBe(2);
  });

  it('returns correct start/end offsets', () => {
    const source = `styles({ color: 'red' })`;
    const sites = findCallSites(source, 'test.js');
    expect(sites).toHaveLength(1);
    expect(sites[0].start).toBe(0);
    expect(sites[0].end).toBe(source.length);
  });

  it('does not include unrelated function calls', () => {
    const source = `console.log('hi'); block('card', {}); fetch('/api');`;
    const sites = findCallSites(source, 'test.js');
    expect(sites).toHaveLength(1);
    expect(sites[0].callName).toBe('block');
  });

  it('returns args as raw source strings', () => {
    const source = `block('hero', { elements: ['title', 'body'] })`;
    const sites = findCallSites(source, 'test.js');
    expect(sites[0].args[0]).toBe("'hero'");
    expect(sites[0].args[1]).toBe("{ elements: ['title', 'body'] }");
  });

  it('returns empty array for unparseable source', () => {
    const source = `const x = <Component />;`; // JSX — not valid acorn input
    expect(() => findCallSites(source, 'test.jsx')).not.toThrow();
    expect(findCallSites(source, 'test.jsx')).toEqual([]);
  });
});

describe('injectFilePath()', () => {
  it('injects __filePath and __salt into block() calls', () => {
    const source = `const b = block('card', {});`;
    const transformed = injectFilePath(source, '/src/card.ts', 'seed');

    expect(transformed).toContain("__filePath: '/src/card.ts'");
    expect(transformed).toContain("__salt: 'seed'");
  });

  it('normalizes windows paths to lowercase posix', () => {
    const source = `block('card', {})`;
    const transformed = injectFilePath(source, 'C:\\Src\\Card.ts', '');

    expect(transformed).toContain("__filePath: 'c:/src/card.ts'");
  });

  it('is idempotent when __filePath already exists', () => {
    const source = `block('card', { __filePath: '/src/card.ts', __salt: '' })`;
    const once = injectFilePath(source, '/src/card.ts', '');
    const twice = injectFilePath(once, '/src/card.ts', '');

    expect(once).toBe(twice);
  });
});

describe('extractStyles()', () => {
  it('extracts one css asset per styles() call', () => {
    const source = `const a = styles({ color: 'red' }); const b = styles({ display: 'flex' });`;
    const extracted = extractStyles(source, '/src/card.block.ts');

    expect(extracted).toHaveLength(2);
    expect(extracted[0].fileName.endsWith('.css')).toBe(true);
    expect(extracted[1].fileName.endsWith('.css')).toBe(true);
  });

  it('emits css with sourceMappingURL and map references original file', () => {
    const source = `styles({ backgroundColor: 'black' });`;
    const extracted = extractStyles(source, 'C:\\Src\\Card.block.ts');

    expect(extracted).toHaveLength(1);
    expect(extracted[0].css).toContain('background-color: black;');
    expect(extracted[0].css).toContain('sourceMappingURL');

    const map = JSON.parse(extracted[0].sourceMap) as { sources: string[] };
    expect(map.sources).toContain('c:/src/card.block.ts');
  });

  it('returns empty assets when no styles() calls are present', () => {
    const extracted = extractStyles(`const x = 1; block('card', {});`, '/src/card.ts');
    expect(extracted).toEqual([]);
  });
});

describe('overlay', () => {
  it('creates a message with attempted and available keys', () => {
    const message = createResolverOverlayMessage({
      file: '/src/Card.tsx',
      blockName: 'card',
      attemptedKeys: ['card__title', 'card-title'],
      availableKeys: ['card', 'card__header'],
      namingSuggestion: 'bem',
    });

    expect(message).toContain('Resolver miss');
    expect(message).toContain('Attempted keys:');
    expect(message).toContain('Available keys:');
    expect(message).toContain('Suggested naming option: bem');
  });

  it('sends a vite error overlay payload when ws is available', () => {
    const send = vi.fn();

    sendResolverOverlay({ ws: { send } }, {
      file: '/src/Card.tsx',
      blockName: 'card',
      attemptedKeys: ['card__title'],
      availableKeys: ['card'],
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].type).toBe('error');
    expect(send.mock.calls[0][0].err.message).toContain('Resolver miss');
  });

  it('does not send overlay payload when ws is unavailable', () => {
    expect(() =>
      sendResolverOverlay(null, {
        file: '/src/Card.tsx',
        blockName: 'card',
        attemptedKeys: ['card__title'],
        availableKeys: ['card'],
      }),
    ).not.toThrow();
  });
});

describe('elemia plugin dev overlay integration', () => {
  it('reports resolver misses in dev mode via plugin api', () => {
    const plugin = elemia({ devOverlay: true });
    const send = vi.fn();

    plugin.configResolved({ command: 'serve' });
    plugin.configureServer({ ws: { send } });
    plugin.api.reportResolverMiss({
      file: '/src/Card.tsx',
      blockName: 'card',
      attemptedKeys: ['card__title'],
      availableKeys: ['card'],
      namingSuggestion: 'bem',
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].err.message).toContain('Suggested naming option: bem');
  });

  it('skips resolver overlay in build mode', () => {
    const plugin = elemia({ devOverlay: true });
    const send = vi.fn();

    plugin.configResolved({ command: 'build' });
    plugin.configureServer({ ws: { send } });
    plugin.api.reportResolverMiss({
      file: '/src/Card.tsx',
      blockName: 'card',
      attemptedKeys: ['card__title'],
      availableKeys: ['card'],
    });

    expect(send).not.toHaveBeenCalled();
  });
});
