/**
 * Deterministic djb2a hash implementation.
 *
 * Returns a fixed-width 6-character base-36 suffix for class name scoping.
 */
export function djb2a(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36).padStart(6, '0').slice(-6);
}

/**
 * Normalizes a path for cross-OS deterministic hashing.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

/**
 * Builds a deterministic scoped block name:
 *   block_hash
 *
 * Input shaping:
 * - default: blockName
 * - with filePath: normalizedFilePath::blockName
 * - with salt: salt::(above input)
 */
export function hashScope(blockName: string, filePath?: string, salt?: string): string {
  const baseInput = filePath
    ? `${normalizePath(filePath)}::${blockName}`
    : blockName;
  const input = salt ? `${salt}::${baseInput}` : baseInput;
  return `${blockName}_${djb2a(input)}`;
}

/**
 * Creates a prefix scoper.
 */
export function prefixScope(prefix: string): (blockName: string) => string {
  return (blockName: string) => `${prefix}-${blockName}`;
}

/**
 * Identity scoper.
 */
export function noneScope(blockName: string): string {
  return blockName;
}
