import type { InferredSchema } from '../types';

function escapeKey(key: string): string {
  return key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function toDts(schema: InferredSchema): string {
  const keys = [...schema.classes].sort((left, right) => left.localeCompare(right));
  const explicitLines = keys.map((key) => `  readonly '${escapeKey(key)}': string;`);

  return [
    'export declare const styles: {',
    ...explicitLines,
    '  readonly [key: string]: string;',
    '};',
    'export default styles;',
    '',
  ].join('\n');
}
