import { cx } from './cx';
import { autoResolver, bemResolver, camelResolver, dashesResolver } from './resolvers';
import { sanitizeBlockName } from './sanitize';
import { hashScope } from './scope';
import type {
  AuthorConfig,
  BlockDescriptor,
  BlockHelper,
  ClassInput,
  ElementConfig,
  ElementsSchema,
  ModifierDef,
  ModifierSchema,
  WrapperConfig,
} from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the flat list of element names from an elements schema.
 * Accepts both array form and record form.
 */
function resolveElementNames(elements: ElementsSchema | undefined): readonly string[] {
  if (!elements) return [];
  if (Array.isArray(elements)) return elements as readonly string[];
  return Object.keys(elements);
}

/**
 * Resolves the per-element config map from a record-form elements schema.
 * Returns null for array schemas and absent schemas — these use non-strict
 * (fallback) modifier resolution to maintain backward compat.
 */
function resolveElementConfigs(
  elements: ElementsSchema | undefined,
): Record<string, ElementConfig> | null {
  if (!elements || Array.isArray(elements)) return null;
  return elements as Record<string, ElementConfig>;
}

/**
 * Sanitizes a modifier value string for safe use in a CSS class name segment.
 * Applies the same transformations as sanitizeBlockName() but returns null
 * instead of throwing when the result is empty (empty values are skipped).
 */
function sanitizeModifierValue(value: string): string | null {
  let s = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  s = s.replace(/[\s_]+/g, '-');
  s = s.replace(/[^a-z0-9-]/g, '');
  s = s.replace(/-{2,}/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  return s.length > 0 ? s : null;
}

/**
 * Converts modifier key + value to a BEM modifier class suffix.
 * Used as the fallback when the modifier key is not present in the schema.
 *
 * Rules:
 * - boolean true  → `--key`
 * - string value  → `--key-value` (value sanitized)
 * - anything else → omitted (returns null)
 */
function modifierSuffix(key: string, value: unknown): string | null {
  if (value === true) return `--${key}`;
  if (typeof value === 'string' && value.length > 0) {
    const safe = sanitizeModifierValue(value);
    return safe ? `--${key}-${safe}` : null;
  }
  return null;
}

/**
 * Resolves the BEM modifier class strings for a single modifier key+value pair
 * using the full ModifierDef from the schema when available.
 *
 * Schema-aware resolution:
 * - def = true (boolean): value true → [prefix--key]; false → []
 * - def = string[] (enum): string value → [prefix--key-value]; else → []
 * - def = { values, multi: true }: string[] → sorted [prefix--key-v1, ...]; string → [prefix--key-v]
 * - def = { values } (non-multi): string → [prefix--key-value]; else → []
 * - def = { map }: string → [prefix--key-${map(value)}]; empty map result → []
 * - def = undefined (not in schema): fallback to basic modifierSuffix logic
 */
function resolveModifierClassesForKey(
  prefix: string,
  key: string,
  value: unknown,
  schema: ModifierSchema,
): string[] {
  const def = schema[key];

  if (def === undefined) {
    // Not in schema — fallback to basic boolean/string resolution (backward compat)
    const suffix = modifierSuffix(key, value);
    return suffix ? [`${prefix}${suffix}`] : [];
  }

  if (def === true) {
    return value === true ? [`${prefix}--${key}`] : [];
  }

  if (Array.isArray(def)) {
    // Enum modifier (readonly string[])
    if (typeof value === 'string' && value.length > 0) {
      const safe = sanitizeModifierValue(value);
      return safe ? [`${prefix}--${key}-${safe}`] : [];
    }
    return [];
  }

  // Remaining union: { values: readonly string[]; multi?: boolean } | { map: (v) => string }
  // Use explicit type assertions to avoid TypeScript union-narrowing ambiguity —
  // `'map' in def` doesn't fully exclude the `values` branch due to structural
  // typing, so we cast explicitly after the discriminant check.
  if ('map' in (def as object)) {
    // Custom map modifier — sanitize the map function's output
    const mapFn = (def as { map: (value: string) => string }).map;
    if (typeof value === 'string' && value.length > 0) {
      const mapped = mapFn(value);
      const safe = mapped.length > 0 ? sanitizeModifierValue(mapped) : null;
      return safe ? [`${prefix}--${key}-${safe}`] : [];
    }
    return [];
  }

  // { values } modifier (multi-select or single-select)
  const valuesDef = def as { values: readonly string[]; multi?: boolean };
  if (valuesDef.multi === true) {
    // Multi-select: accepts string or string[]
    if (Array.isArray(value)) {
      // Collect valid string elements, sanitize each one.
      const parts: string[] = [];
      for (const v of value as unknown[]) {
        if (typeof v === 'string' && (v as string).length > 0) {
          const safe = sanitizeModifierValue(v as string);
          if (safe) parts.push(safe);
        }
      }
      return parts.sort().map(v => `${prefix}--${key}-${v}`);
    }
    if (typeof value === 'string' && value.length > 0) {
      const safe = sanitizeModifierValue(value);
      return safe ? [`${prefix}--${key}-${safe}`] : [];
    }
    return [];
  }

  // Single-select with values (no multi)
  if (typeof value === 'string' && value.length > 0) {
    const safe = sanitizeModifierValue(value);
    return safe ? [`${prefix}--${key}-${safe}`] : [];
  }
  return [];
}

/**
 * Builds sorted modifier class strings from a modifiers record.
 *
 * @param strict - When true, only keys present in the schema are processed
 *   (disjoint enforcement for record-schema element calls). When false,
 *   all provided keys are processed with schema-aware fallback resolution.
 */
function buildModifierClasses(
  prefix: string,
  modifiers: Record<string, unknown>,
  schema: ModifierSchema,
  strict: boolean,
): string[] {
  const keys = Object.keys(modifiers).sort();
  const classes: string[] = [];
  for (const key of keys) {
    if (strict && !(key in schema)) continue;
    classes.push(...resolveModifierClassesForKey(prefix, key, modifiers[key], schema));
  }
  return classes;
}

/**
 * Builds the effective modifier schema for an element call.
 * Combines the element's own modifiers with any block-level modifiers
 * listed in the element's `inherit` array.
 */
function buildElementModifierSchema(
  elementConfig: ElementConfig | undefined,
  blockModifiers: ModifierSchema,
): ModifierSchema {
  const ownModifiers: ModifierSchema = elementConfig?.modifiers ?? {};
  const inherit = elementConfig?.inherit ?? [];
  const inheritedModifiers: ModifierSchema = {};
  for (const key of inherit) {
    if (key in blockModifiers) {
      inheritedModifiers[key] = blockModifiers[key];
    }
  }
  return { ...ownModifiers, ...inheritedModifiers };
}

/**
 * Resolves the BEM key to look up in a styles object for `b.has()`.
 *
 * For CORE-01 this uses the basic BEM convention: `blockName__elementName`.
 * The full auto-resolver (camel / dashes / bem) is implemented in CORE-09.
 */
function resolveBemKey(blockName: string, element: string): string {
  return `${blockName}__${element}`;
}

/**
 * Resolves a BEM class key against a CSS Module styles object.
 * Returns the hashed CSS Module value when the key exists; falls back to the
 * raw BEM key when it does not.
 */
function resolveClass(styles: Record<string, string>, bemKey: string): string {
  return styles[bemKey] ?? bemKey;
}

// ---------------------------------------------------------------------------
// Core block() factory — unified implementation
// ---------------------------------------------------------------------------

interface InternalConfig {
  mode: 'wrapper' | 'author';
  /** Descriptor name (original author name or inferred wrapper root key). */
  descriptorName: string;
  /** Class base used at runtime for root/element class generation. */
  classBase: string;
  styles: Record<string, string> | null;
  elementNames: readonly string[];
  /**
   * Per-element configs keyed by element name — present only when the elements
   * schema is a record (Record<string, ElementConfig>). null for array schemas
   * and no-schema cases, which use fallback (non-disjoint) modifier resolution.
   */
  elementConfigs: Record<string, ElementConfig> | null;
  modifiers: ModifierSchema;
  naming: 'auto' | 'camel' | 'dashes' | 'bem';
}

function makeBlockHelper(config: InternalConfig): BlockHelper {
  const { mode, styles } = config;
  const classBase = config.classBase;

  // -------------------------------------------------------------------------
  // The main callable: b(element, modifiers?, ...extra)
  // -------------------------------------------------------------------------
  function b(
    element: string | null | undefined,
    modifiers?: Record<string, unknown>,
    ...extra: ClassInput[]
  ): string {
    const parts: string[] = [];

    if (element == null) {
      // Block root call: b(null, modifiers?, ...extra)
      // Root calls always use fallback/schema-aware resolution (non-strict)
      // with the block-level modifier schema.
      if (mode === 'wrapper' && styles) {
        parts.push(resolveClass(styles, classBase));
        if (modifiers) {
          const modClasses = buildModifierClasses(classBase, modifiers, config.modifiers, false);
          parts.push(...modClasses.map(cls => resolveClass(styles, cls)));
        }
      } else {
        // Author mode
        parts.push(classBase);
        if (modifiers) {
          parts.push(...buildModifierClasses(classBase, modifiers, config.modifiers, false));
        }
      }
    } else {
      // Element call: b('thumbnail', modifiers?, ...extra)
      const bemBase = `${classBase}__${element}`;

      // Determine modifier resolution mode:
      // - Record schema → strict (disjoint): only element's own + inherited modifiers
      // - Array schema / no schema → fallback: any modifier generates a class
      const isRecordSchema = config.elementConfigs !== null;
      const effectiveModifierSchema = isRecordSchema
        ? buildElementModifierSchema(config.elementConfigs![element], config.modifiers)
        : config.modifiers;

      if (mode === 'wrapper' && styles) {
        const resolveElementClass = (
          elementName: string,
          elementModifiers?: Record<string, unknown> | string,
        ): string => {
          if (config.naming === 'camel') {
            return camelResolver(styles, elementName, elementModifiers, classBase);
          }
          if (config.naming === 'dashes') {
            return dashesResolver(styles, elementName, elementModifiers, classBase);
          }
          if (config.naming === 'bem') {
            return bemResolver(styles, classBase, elementName, elementModifiers);
          }
          return autoResolver(styles, classBase, elementName, elementModifiers);
        };

        parts.push(resolveElementClass(element));
        if (modifiers) {
          const modClasses = buildModifierClasses(bemBase, modifiers, effectiveModifierSchema, isRecordSchema);
          for (const modClass of modClasses) {
            const segmentPrefix = `${bemBase}--`;
            if (!modClass.startsWith(segmentPrefix)) {
              parts.push(resolveClass(styles, modClass));
              continue;
            }

            const segment = modClass.slice(segmentPrefix.length);
            parts.push(resolveElementClass(element, segment));
          }
        }
      } else {
        // Author mode
        parts.push(bemBase);
        if (modifiers) {
          parts.push(...buildModifierClasses(bemBase, modifiers, effectiveModifierSchema, isRecordSchema));
        }
      }
    }

    // Append extra classes (falsy-filtered, deduped via cx)
    return cx(...(parts as ClassInput[]), ...extra);
  }

  // -------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------
  b.styles = mode === 'wrapper' ? styles : null;

  b.root = function (
    modifiers?: Record<string, unknown>,
    ...extra: ClassInput[]
  ): string {
    return b(null, modifiers, ...extra);
  };

  b.has = function (element: string, modifier?: string, value?: string): boolean {
    if (mode === 'author' || !styles) return false;
    let key = resolveBemKey(classBase, element);
    if (modifier) {
      key += value ? `--${modifier}-${value}` : `--${modifier}`;
    }
    return Object.prototype.hasOwnProperty.call(styles, key);
  };

  b.descriptor = {
    name: config.descriptorName,
    mode,
    scopedName: mode === 'author' ? classBase : null,
    elements: config.elementNames,
    modifiers: config.modifiers,
  } satisfies BlockDescriptor;

  // TypeScript cannot directly widen a plain function to an interface type that
  // includes both a call signature and property members. The double cast through
  // `unknown` is the standard pattern for callable-object types in TypeScript.
  // All properties (styles, root, has, descriptor) are assigned above before
  // this cast, so this is verified safe at this boundary.
  return b as unknown as BlockHelper;
}

// ---------------------------------------------------------------------------
// Wrapper-mode root key inference
// ---------------------------------------------------------------------------

/**
 * Infers the BEM block root key from a CSS Module styles object.
 *
 * Resolution order:
 * 1. Use `explicitRootKey` if provided and present in the styles object.
 * 2. Among plain keys (no `__` or `--`), prefer a key that has at least one
 *    other key starting with `key + '__'` or `key + '--'` (genuine BEM root).
 * 3. Fall back to the first plain key, then the first key of any kind.
 */
function inferRootKey(styles: Record<string, string>, explicitRootKey?: string): string {
  const keys = Object.keys(styles);
  if (keys.length === 0) return '';

  if (explicitRootKey && Object.prototype.hasOwnProperty.call(styles, explicitRootKey)) {
    return explicitRootKey;
  }

  const plainKeys = keys.filter(k => !k.includes('__') && !k.includes('--'));

  // Among plain keys, prefer one that is genuinely a BEM block root (has children).
  for (const k of plainKeys) {
    if (keys.some(other => other.startsWith(`${k}__`) || other.startsWith(`${k}--`))) {
      return k;
    }
  }

  // Fall back to first plain key, then first key overall.
  return plainKeys[0] ?? keys[0]!;
}

// ---------------------------------------------------------------------------
// Public overloads
// ---------------------------------------------------------------------------

/**
 * Creates a BlockHelper that wraps an existing CSS Module object.
 * Element and modifier class names are resolved from the styles object
 * using the configured naming convention (default: 'auto').
 *
 * @param cssModuleImport - The imported CSS Module object.
 * @param config - Wrapper configuration: elements, modifiers, naming convention.
 * @returns A typed BlockHelper callable.
 */
export function block<
  E extends ElementsSchema = ElementsSchema,
  M extends ModifierSchema = Record<never, ModifierDef>,
>(cssModuleImport: Record<string, string>, config: WrapperConfig<E, M>): BlockHelper<E, M>;

/**
 * Creates a BlockHelper in author mode.
 * Generates scoped BEM class strings from the block name.
 * The block name is sanitized at creation time.
 *
 * @param name - The block name (e.g. 'card', 'MyCard'). Sanitized automatically.
 * @param config - Optional author configuration: elements, modifiers, scope injection.
 * @returns A typed BlockHelper callable.
 */
export function block<
  E extends ElementsSchema = ElementsSchema,
  M extends ModifierSchema = Record<never, ModifierDef>,
>(name: string, config?: AuthorConfig<E, M>): BlockHelper<E, M>;

export function block(
  nameOrStyles: string | Record<string, string>,
  config: WrapperConfig | AuthorConfig = {},
): BlockHelper {
  if (typeof nameOrStyles === 'string') {
    // Author mode
    const sanitized = sanitizeBlockName(nameOrStyles);
    const authorCfg = config as AuthorConfig;

    const scopedName = authorCfg.__filePath
      ? hashScope(sanitized, authorCfg.__filePath, authorCfg.__salt)
      : hashScope(sanitized);

    if (!authorCfg.__filePath) {
      console.warn(
        `[@elemia/core] block('${nameOrStyles}') has no __filePath - using name-only hash.\n` +
          'Install @elemia/plugin-vite for deterministic SSR-safe scoping.',
      );
    }

    return makeBlockHelper({
      mode: 'author',
      descriptorName: nameOrStyles,
      classBase: scopedName,
      styles: null,
      elementNames: resolveElementNames(authorCfg.elements),
      elementConfigs: resolveElementConfigs(authorCfg.elements),
      modifiers: authorCfg.modifiers ?? {},
      naming: 'auto',
    });
  }

  // Wrapper mode — styles object provided as first argument
  const stylesObj = nameOrStyles;
  const wrapperCfg = config as WrapperConfig;
  const rootKey = inferRootKey(stylesObj, wrapperCfg.rootKey);

  return makeBlockHelper({
    mode: 'wrapper',
    descriptorName: rootKey,
    classBase: rootKey,
    styles: stylesObj,
    elementNames: resolveElementNames(wrapperCfg.elements),
    elementConfigs: resolveElementConfigs(wrapperCfg.elements),
    modifiers: wrapperCfg.modifiers ?? {},
    naming: wrapperCfg.naming ?? 'auto',
  });
}
