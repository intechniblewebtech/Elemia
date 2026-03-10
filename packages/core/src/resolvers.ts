type StylesObject = Record<string, string>;

type NamingConvention = 'camel' | 'dashes' | 'bem';

type Modifiers = Record<string, unknown> | string | undefined;

let namingCache = new WeakMap<StylesObject, NamingConvention>();

function toCamel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('');
}

function toPascalFromSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function firstModifierSegment(modifiers: Modifiers): string | null {
  if (!modifiers) return null;
  if (typeof modifiers === 'string') return modifiers;
  const keys = Object.keys(modifiers).sort();
  for (const key of keys) {
    const value = modifiers[key];
    if (value === true) return key;
    if (typeof value === 'string' && value.length > 0) return `${key}-${value}`;
  }
  return null;
}

function camelKey(element: string, modifiers?: Modifiers, blockName?: string): string {
  const base = blockName
    ? `${toCamel(blockName)}${toPascalFromSegment(element)}`
    : toCamel(element);
  const segment = firstModifierSegment(modifiers);
  if (!segment) return base;
  return `${base}${toPascalFromSegment(segment)}`;
}

function dashesKey(element: string, modifiers?: Modifiers, blockName?: string): string {
  const base = blockName ? `${blockName}-${element}` : element;
  const segment = firstModifierSegment(modifiers);
  if (!segment) return base;
  return `${base}--${segment}`;
}

function bemKey(blockName: string, element: string, modifiers?: Modifiers): string {
  const base = `${blockName}__${element}`;
  const segment = firstModifierSegment(modifiers);
  if (!segment) return base;
  return `${base}--${segment}`;
}

export function camelResolver(
  styles: StylesObject,
  element: string,
  modifiers?: Modifiers,
  blockName?: string,
): string {
  // Prefer block-prefixed key (e.g. 'cardTitle') when it exists; fall back to
  // bare element key (e.g. 'title') for modules that omit the block prefix.
  if (blockName) {
    const prefixedKey = camelKey(element, modifiers, blockName);
    if (Object.prototype.hasOwnProperty.call(styles, prefixedKey)) {
      return styles[prefixedKey]!;
    }
  }
  const key = camelKey(element, modifiers);
  return styles[key] ?? key;
}

export function dashesResolver(
  styles: StylesObject,
  element: string,
  modifiers?: Modifiers,
  blockName?: string,
): string {
  // Prefer block-prefixed key (e.g. 'card-title') when it exists; fall back to
  // bare element key (e.g. 'title') for modules that omit the block prefix.
  if (blockName) {
    const prefixedKey = dashesKey(element, modifiers, blockName);
    if (Object.prototype.hasOwnProperty.call(styles, prefixedKey)) {
      return styles[prefixedKey]!;
    }
  }
  const key = dashesKey(element, modifiers);
  return styles[key] ?? key;
}

export function bemResolver(
  styles: StylesObject,
  blockName: string,
  element: string,
  modifiers?: Modifiers,
): string {
  const key = bemKey(blockName, element, modifiers);
  return styles[key] ?? key;
}

function detectConvention(
  styles: StylesObject,
  blockName: string,
  element: string,
  modifiers?: Modifiers,
): NamingConvention | null {
  const attempts: Array<{ convention: NamingConvention; key: string }> = [
    // Block-prefixed probes first (realistic CSS Module structures)
    { convention: 'camel', key: camelKey(element, modifiers, blockName) },
    { convention: 'dashes', key: dashesKey(element, modifiers, blockName) },
    { convention: 'bem', key: bemKey(blockName, element, modifiers) },
    // Bare-element probes as fallback (CSS modules without block prefix)
    { convention: 'camel', key: camelKey(element, modifiers) },
    { convention: 'dashes', key: dashesKey(element, modifiers) },
  ];

  // If modifier-based keys are not present, fall back to base-element probes.
  if (modifiers) {
    attempts.push(
      { convention: 'camel', key: camelKey(element, undefined, blockName) },
      { convention: 'dashes', key: dashesKey(element, undefined, blockName) },
      { convention: 'camel', key: camelKey(element) },
      { convention: 'dashes', key: dashesKey(element) },
      { convention: 'bem', key: bemKey(blockName, element) },
    );
  }

  for (const attempt of attempts) {
    if (Object.prototype.hasOwnProperty.call(styles, attempt.key)) {
      return attempt.convention;
    }
  }
  return null;
}

export function autoResolver(
  styles: StylesObject,
  blockName: string,
  element: string,
  modifiers?: Modifiers,
): string {
  const cached = namingCache.get(styles);

  if (cached === 'camel') return camelResolver(styles, element, modifiers, blockName);
  if (cached === 'dashes') return dashesResolver(styles, element, modifiers, blockName);
  if (cached === 'bem') return bemResolver(styles, blockName, element, modifiers);

  const detected = detectConvention(styles, blockName, element, modifiers);
  if (detected) {
    namingCache.set(styles, detected);
    if (detected === 'camel') return camelResolver(styles, element, modifiers, blockName);
    if (detected === 'dashes') return dashesResolver(styles, element, modifiers, blockName);
    return bemResolver(styles, blockName, element, modifiers);
  }

  const attempted = {
    camel: camelKey(element, modifiers, blockName),
    dashes: dashesKey(element, modifiers, blockName),
    bem: bemKey(blockName, element, modifiers),
  };

  const available = Object.keys(styles).slice(0, 10);
  const hasMore = Object.keys(styles).length > 10 ? '...' : '';

  throw new Error(
    `[@elemia/core] Resolver miss for element '${element}' in block '${blockName}'.\n` +
      `Tried: camel ('${attempted.camel}'), dashes ('${attempted.dashes}'), bem ('${attempted.bem}').\n` +
      `Available keys: [${available.join(', ')}${hasMore}].\n` +
      "Suggestion: set naming: 'dashes' or rename CSS class.",
  );
}

export function resetResolverCache(): void {
  namingCache = new WeakMap<StylesObject, NamingConvention>();
}
