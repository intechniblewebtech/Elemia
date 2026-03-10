import type { ClassInput } from './types';

/**
 * Joins class name arguments into a single space-separated string.
 *
 * Falsy values (false, null, undefined, empty string) are ignored.
 * Duplicate class names are deduplicated; the first occurrence is kept.
 *
 * @param args - Any mix of strings and falsy values.
 * @returns A deduplicated, space-joined class string.
 */
export function cx(...args: ClassInput[]): string {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const arg of args) {
    if (!arg) continue;
    if (seen.has(arg)) continue;
    seen.add(arg);
    result.push(arg);
  }

  return result.join(' ');
}
