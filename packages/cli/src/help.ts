export const EXIT_SUCCESS = 0;
export const EXIT_VALIDATION_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;

export function renderHelp(): string {
  return [
    'Elemia CLI',
    '',
    'Usage:',
    '  elemia <command> [...args] [--flags]',
    '',
    'Commands:',
    '  generate-types <input...> [--dry-run] [--cwd <path>]',
    '  check <css-file> [schema-file] [--strict] [--json]',
    '  manifest <input> <out-file> [--cwd <path>]',
    '  compare <css-file> <block-ts-file> [--strict]',
    '',
    'Exit codes:',
    '  0 success',
    '  1 validation failure',
    '  2 usage error',
  ].join('\n');
}

export function renderCommandHelp(command: string): string {
  switch (command) {
    case 'generate-types':
      return [
        'Usage: elemia generate-types <input...> [--dry-run] [--cwd <path>]',
        '',
        'Arguments:',
        '  input...     File path(s) or glob pattern(s) for .module.css files',
        '',
        'Options:',
        '  --dry-run    Print generated declarations to stdout without writing files',
        '  --cwd <path> Resolve relative paths from this directory',
      ].join('\n');
    case 'check':
      return [
        'Usage: elemia check <css-file> [schema-file] [--strict] [--json]',
        '',
        'Arguments:',
        '  css-file     CSS module file to validate',
        '  schema-file  Optional schema JSON file; if omitted, schema is inferred from CSS',
        '',
        'Options:',
        '  --strict     Exit with code 1 when drift is detected',
        '  --json       Print JSON output',
      ].join('\n');
    case 'manifest':
      return [
        'Usage: elemia manifest <input> <out-file> [--cwd <path>]',
        '',
        'Arguments:',
        '  input        Directory path or glob pattern for CSS module files',
        '  out-file     Output JSON manifest path',
        '',
        'Options:',
        '  --cwd <path> Resolve paths from this directory',
      ].join('\n');
    case 'compare':
      return [
        'Usage: elemia compare <css-file> <block-ts-file> [--strict]',
        '',
        'Arguments:',
        '  css-file       Original CSS module file',
        '  block-ts-file  Converted .block.ts file',
        '',
        'Options:',
        '  --strict       Exit with code 1 when semantic differences are detected',
      ].join('\n');
    default:
      return `Unknown command: ${command}`;
  }
}
