/**
 * AST Traversal Strategy for @elemia/plugin-vite
 * ================================================
 * Decision: use acorn (the same parser Rollup/Vite bundle internally) for
 * maximum compatibility and zero net dependency cost at the user project level.
 * acorn is listed as a direct dependency of this package so it is available at
 * build time when the Vite plugin executes.
 *
 * Alternative considered: Babel (@babel/parser + @babel/traverse) — rejected
 * because it adds ~1 MB to the toolchain and is unnecessary for the simple
 * CalleExpression detection this traversal layer needs.
 *
 * Alternative considered: SWC — rejected because it has no stable public AST
 * walking API and is overkill for detection-only use.
 *
 * This module is DETECTION ONLY — it locates block() and styles() call sites
 * in source strings and returns their positions. No code transformation is
 * performed here; that is handled by VITE-02 onwards.
 */

import { parse, type Node } from 'acorn';

import type { CallSite } from './types';

/** Callee names that identify Elemia call sites. */
const ELEMIA_CALLS = new Set(['block', 'styles']);

/**
 * Recursively walks an acorn AST node and collects all matching CallExpression
 * nodes whose callee is an Elemia function name.
 */
function walk(node: Node | null | undefined, source: string, results: CallSite[]): void {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'CallExpression') {
    const callee = (node as unknown as { callee: Node & { name?: string; type: string } }).callee;
    const callName = callee.type === 'Identifier' ? (callee.name ?? '') : '';

    if (ELEMIA_CALLS.has(callName)) {
      const callNode = node as unknown as {
        start: number;
        end: number;
        loc?: { start: { line: number; column: number } };
        arguments: Array<Node & { start: number; end: number }>;
      };

      const args = callNode.arguments.map((arg) =>
        source.slice(arg.start, arg.end),
      );

      results.push({
        callName,
        start: callNode.start,
        end: callNode.end,
        line: callNode.loc?.start.line ?? 1,
        column: callNode.loc?.start.column ?? 0,
        args,
      });
    }
  }

  // Walk child nodes
  for (const value of Object.values(node as unknown as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        walk(child as Node, source, results);
      }
    } else if (value !== null && typeof value === 'object' && 'type' in value) {
      walk(value as Node, source, results);
    }
  }
}

/**
 * Parses a JS/TS source string and returns all Elemia call sites found.
 *
 * Supports ESM and CJS source. TypeScript syntax is NOT supported here —
 * the Vite `transform` hook receives already-transpiled JS. If you need
 * to traverse raw TS, pre-strip types before calling this function.
 *
 * @param source - JS source code string to search
 * @param _id    - File path of the source (reserved for future filtering)
 * @returns      Array of CallSite descriptors, in source order
 */
export function findCallSites(source: string, _id: string): CallSite[] {
  let ast: Node;
  try {
    ast = parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
  } catch {
    // If the source fails to parse (e.g., JSX, decorators), return empty.
    return [];
  }

  const results: CallSite[] = [];
  walk(ast, source, results);
  return results;
}
