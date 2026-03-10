import { findCallSites } from './traverse';

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

function splitTopLevelArgs(input: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  let quote: 'single' | 'double' | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : '';

    if (quote) {
      if (quote === 'single' && ch === "'" && prev !== '\\') quote = null;
      if (quote === 'double' && ch === '"' && prev !== '\\') quote = null;
      continue;
    }

    if (ch === "'") {
      quote = 'single';
      continue;
    }

    if (ch === '"') {
      quote = 'double';
      continue;
    }

    if (ch === '{' || ch === '[' || ch === '(') depth += 1;
    if (ch === '}' || ch === ']' || ch === ')') depth -= 1;

    if (ch === ',' && depth === 0) {
      args.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }

  const tail = input.slice(start).trim();
  if (tail.length > 0) {
    args.push(tail);
  }

  return args;
}

function injectIntoCallExpression(callExpression: string, filePath: string, salt: string): string {
  if (!callExpression.startsWith('block(') || !callExpression.endsWith(')')) {
    return callExpression;
  }

  const inner = callExpression.slice('block('.length, -1);
  const args = splitTopLevelArgs(inner);

  if (args.length === 0) {
    return callExpression;
  }

  const injectedProps = `__filePath: '${normalizePath(filePath)}', __salt: '${salt}'`;

  if (args.length === 1) {
    return `block(${args[0]}, { ${injectedProps} })`;
  }

  const secondArg = args[1].trim();
  if (/__filePath\s*:/.test(secondArg)) {
    return callExpression;
  }

  if (secondArg.startsWith('{') && secondArg.endsWith('}')) {
    const body = secondArg.slice(1, -1).trim();
    args[1] = body.length === 0 ? `{ ${injectedProps} }` : `{ ${injectedProps}, ${body} }`;
    return `block(${args.join(', ')})`;
  }

  return callExpression;
}

export function injectFilePath(source: string, id: string, salt = ''): string {
  const callSites = findCallSites(source, id).filter((site) => site.callName === 'block');

  if (callSites.length === 0) {
    return source;
  }

  let output = source;
  for (const site of [...callSites].sort((a, b) => b.start - a.start)) {
    const original = output.slice(site.start, site.end);
    const updated = injectIntoCallExpression(original, id, salt);
    if (updated !== original) {
      output = output.slice(0, site.start) + updated + output.slice(site.end);
    }
  }

  return output;
}
