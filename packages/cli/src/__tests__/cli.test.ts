import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../commands/generate-types', () => ({
  generateTypes: vi.fn(async () => ({})),
}));

vi.mock('../commands/check', () => ({
  check: vi.fn(async () => ({ exitCode: 0, diff: { missing: [], extra: [] }, output: 'ok' })),
}));

vi.mock('../commands/compare', () => ({
  compare: vi.fn(async () => ({
    exitCode: 0,
    output: 'compare-ok',
    diff: { added: [], removed: [], unchanged: [] },
  })),
}));

vi.mock('../commands/manifest', () => ({
  manifest: vi.fn(async () => ({ blocks: [] })),
}));

import { runCli } from '../cli';
import { check } from '../commands/check';
import { compare } from '../commands/compare';
import { generateTypes } from '../commands/generate-types';
import { manifest } from '../commands/manifest';

function createIO() {
  const out: string[] = [];
  const err: string[] = [];

  return {
    io: {
      out: (message: string) => out.push(message),
      err: (message: string) => err.push(message),
    },
    out,
    err,
  };
}

describe('runCli()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prints top-level help for empty args', async () => {
    const sink = createIO();

    const exitCode = await runCli([], sink.io);

    expect(exitCode).toBe(0);
    expect(sink.out.join('\n')).toContain('Elemia CLI');
  });

  it('routes generate-types and returns success', async () => {
    const sink = createIO();

    const exitCode = await runCli(['generate-types', 'src/**/*.module.css', '--dry-run'], sink.io);

    expect(exitCode).toBe(0);
    expect(generateTypes).toHaveBeenCalledWith(['src/**/*.module.css'], { dryRun: true });
  });

  it('routes check and maps strict drift to exit code 1', async () => {
    const sink = createIO();
    vi.mocked(check).mockResolvedValueOnce({
      exitCode: 1,
      diff: { missing: ['card--active'], extra: [] },
      output: 'drift',
    });

    const exitCode = await runCli(['check', 'Card.module.css', '--strict'], sink.io);

    expect(exitCode).toBe(1);
    expect(check).toHaveBeenCalledWith('Card.module.css', undefined, { strict: true, json: false });
    expect(sink.out.join('\n')).toContain('drift');
  });

  it('routes manifest and returns success', async () => {
    const sink = createIO();

    const exitCode = await runCli(['manifest', 'src', 'manifest.json', '--cwd', 'project'], sink.io);

    expect(exitCode).toBe(0);
    expect(manifest).toHaveBeenCalledWith('src', 'manifest.json', { cwd: 'project' });
  });

  it('returns usage error for unknown command', async () => {
    const sink = createIO();

    const exitCode = await runCli(['unknown'], sink.io);

    expect(exitCode).toBe(2);
    expect(sink.err.join('\n')).toContain('Elemia CLI');
  });

  it('prints command help via --help flag', async () => {
    const sink = createIO();

    const exitCode = await runCli(['check', '--help'], sink.io);

    expect(exitCode).toBe(0);
    expect(sink.out.join('\n')).toContain('Usage: elemia check');
  });

  it('routes compare and returns success', async () => {
    const sink = createIO();

    const exitCode = await runCli(['compare', 'Card.module.css', 'Card.block.ts'], sink.io);

    expect(exitCode).toBe(0);
    expect(compare).toHaveBeenCalledWith('Card.module.css', 'Card.block.ts', { strict: false });
    expect(sink.out.join('\n')).toContain('compare-ok');
  });

  it('routes compare and maps strict differences to exit code 1', async () => {
    const sink = createIO();
    vi.mocked(compare).mockResolvedValueOnce({
      exitCode: 1,
      output: 'semantic-drift',
      diff: { added: ['card--new'], removed: [], unchanged: ['card'] },
    });

    const exitCode = await runCli(['compare', 'Card.module.css', 'Card.block.ts', '--strict'], sink.io);

    expect(exitCode).toBe(1);
    expect(compare).toHaveBeenCalledWith('Card.module.css', 'Card.block.ts', { strict: true });
    expect(sink.out.join('\n')).toContain('semantic-drift');
  });
});
