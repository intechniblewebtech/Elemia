/**
 * Normalizes a block name to a safe ASCII kebab-case string suitable for use
 * in CSS class names.
 *
 * Transformation steps:
 * 1. Normalize Unicode to NFD and strip combining diacritics (é → e, ü → u).
 * 2. Lowercase the entire string.
 * 3. Replace whitespace and underscores with hyphens.
 * 4. Strip any character not in [a-z0-9-].
 * 5. Collapse runs of consecutive hyphens to a single hyphen.
 * 6. Trim leading and trailing hyphens.
 * 7. Throw if the result is empty.
 *
 * @param name - The raw block name (e.g. 'MyCard', 'card__hero', 'café').
 * @returns A sanitized kebab-case block name.
 * @throws {Error} When the sanitized result is an empty string.
 */
export function sanitizeBlockName(name: string): string {
  // Step 1 & 2: decompose Unicode, strip diacritics, lowercase
  let sanitized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Step 3: replace whitespace and underscores with hyphens
  sanitized = sanitized.replace(/[\s_]+/g, '-');

  // Step 4: strip characters not matching [a-z0-9-]
  sanitized = sanitized.replace(/[^a-z0-9-]/g, '');

  // Step 5: collapse consecutive hyphens
  sanitized = sanitized.replace(/-{2,}/g, '-');

  // Step 6: trim leading and trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Step 7: reject empty result
  if (!sanitized) {
    throw new Error(
      `[@elemia/core] Block name '${name}' sanitized to empty string.`,
    );
  }

  return sanitized;
}
