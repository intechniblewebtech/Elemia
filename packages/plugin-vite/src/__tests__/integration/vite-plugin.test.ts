import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, type Rollup } from 'vite';
import { describe, expect, it, vi } from 'vitest';

import { elemia } from '../../index';

const currentDir = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(currentDir, 'fixtures', 'basic');

function asText(source: string | Uint8Array | undefined): string {
  if (typeof source === 'string') {
    return source;
  }

  if (source instanceof Uint8Array) {
    return Buffer.from(source).toString('utf8');
  }

  return '';
}

describe('elemia vite integration', () => {
  it('builds a real fixture and emits extracted css + path injection', async () => {
    const output = await build({
      root: fixtureRoot,
      logLevel: 'silent',
      plugins: [elemia()],
      build: {
        write: false,
        sourcemap: true,
      },
    });

    // vite.build() with write:false never returns a RollupWatcher; the type
    // union is conservative. Narrowing via Array.isArray + 'output' in is sufficient.
    const outputList = Array.isArray(output) ? output : 'output' in output ? [output] : [];
    const chunks = outputList.flatMap((entry) => entry.output);
    const assets = chunks.filter((chunk): chunk is Rollup.OutputAsset => chunk.type === 'asset');
    const jsChunks = chunks.filter((chunk): chunk is Rollup.OutputChunk => chunk.type === 'chunk');

    const extractedCss = assets.find((asset) => asset.fileName.endsWith('.css'));
    expect(extractedCss).toBeDefined();
    expect(asText(extractedCss?.source)).toContain('color: red;');

    const mapAsset = assets.find((asset) => asset.fileName.endsWith('.css.map'));
    expect(mapAsset).toBeDefined();

    const parsedMap = JSON.parse(asText(mapAsset?.source)) as { sources: string[] };
    expect(parsedMap.sources.some((source) => source.endsWith('/card.block.ts'))).toBe(true);

    const transformedSource = jsChunks.map((chunk) => chunk.code).join('\n');
    expect(transformedSource).toContain('__filePath');
    expect(transformedSource).toContain('card.block.ts');
  });

  it('formats and reports dev overlay messages with expected structure', () => {
    const plugin = elemia({ devOverlay: true });
    const send = vi.fn();

    plugin.configResolved({ command: 'serve' });
    plugin.configureServer({ ws: { send } });

    plugin.api.reportResolverMiss({
      file: '/src/card.block.ts',
      blockName: 'card',
      attemptedKeys: ['card__title'],
      availableKeys: ['card', 'card__header'],
      namingSuggestion: 'bem',
    });

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0] as { err: { message: string } };
    expect(payload.err.message).toContain('Resolver miss');
    expect(payload.err.message).toContain('Attempted keys:');
    expect(payload.err.message).toContain('Available keys:');
    expect(payload.err.message).toContain('Suggested naming option: bem');
  });

  it('fixture entry imports the .block module', async () => {
    const source = await readFile(join(fixtureRoot, 'src', 'main.ts'), 'utf8');
    expect(source).toContain("'./card.block'");
  });
});
