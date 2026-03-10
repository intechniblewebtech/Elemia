import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bench, describe } from 'vitest';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const warningThresholdSeconds = 5;

function runTypeCheckDiagnostics(): string {
  return execSync(
    [
      'pnpm exec tsc',
      '--noEmit',
      '--strict',
      '--target ES2020',
      '--module ESNext',
      '--moduleResolution Bundler',
      '--skipLibCheck',
      '--esModuleInterop',
      '--isolatedModules',
      '--exactOptionalPropertyTypes',
      '--extendedDiagnostics',
      '--pretty false',
      'bench/fixtures/complex-schema.ts',
    ].join(' '),
    {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

function parseCheckTimeSeconds(output: string): number {
  const match = output.match(/Check time:\s*([0-9.]+)s/i);
  if (!match) {
    throw new Error('Unable to parse TypeScript check time from diagnostics output.');
  }

  return Number.parseFloat(match[1]);
}

describe('TypeScript compile speed benchmark', () => {
  /**
   * Measures tsc `Check time` for the complex-schema fixture (55 blocks, 7 modifiers each).
   * Runs once per bench invocation — this is a compile-time measurement, not a micro-benchmark.
   * Warns to console (does not fail) when check time exceeds the 5-second CI threshold.
   *
   * CI log scraping: look for lines matching "TypeScript Check time: <N>s".
   */
  bench(
    'tsc --noEmit check time (55 blocks × 7 modifiers)',
    () => {
      const diagnostics = runTypeCheckDiagnostics();
      const checkTimeSeconds = parseCheckTimeSeconds(diagnostics);

      // Keep output machine-readable for CI log scraping.
      console.log(`TypeScript Check time: ${checkTimeSeconds.toFixed(2)}s`);

      if (checkTimeSeconds > warningThresholdSeconds) {
        console.warn(
          `Warning: TypeScript Check time ${checkTimeSeconds.toFixed(2)}s exceeds ${warningThresholdSeconds}s threshold.`,
        );
      }
    },
    {
      // Run exactly once — tsc invocations are slow by nature and statistical
      // sampling adds no value here. The goal is a single baseline measurement.
      iterations: 1,
      time: 0,
    },
  );
});
