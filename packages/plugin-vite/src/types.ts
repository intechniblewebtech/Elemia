/**
 * Represents a single call site for a block() or styles() call found
 * during AST traversal of user source code.
 */
export interface CallSite {
  /** Name of the callee function — 'block' or 'styles'. */
  callName: string;
  /** Absolute character offset of the call expression start. */
  start: number;
  /** Absolute character offset of the call expression end. */
  end: number;
  /** 1-based line number of the call expression. */
  line: number;
  /** 0-based column of the call expression. */
  column: number;
  /** Raw source strings of each argument passed to the call. */
  args: string[];
}
