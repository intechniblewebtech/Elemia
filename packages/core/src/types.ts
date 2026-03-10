/**
 * ClassInput — any value accepted by cx() or as an extra class argument.
 * Falsy values (false, null, undefined, empty string) are filtered out.
 */
export type ClassInput = string | false | null | undefined;

// ---------------------------------------------------------------------------
// Modifier schema types (full implementation — CORE-03)
// ---------------------------------------------------------------------------

/** A single modifier definition within a block or element schema. */
export type ModifierDef =
  | true
  | readonly string[]
  | { values: readonly string[]; multi?: boolean }
  | { map: (value: string) => string };

/** A record of modifier key → modifier definition. */
export type ModifierSchema = Record<string, ModifierDef>;

/**
 * Maps a single ModifierDef to the set of valid JavaScript values that can be
 * passed at a call site:
 * - true (boolean def) → boolean
 * - readonly string[] (enum def) → the literal string union
 * - { values, multi: true } (multi-select) → single value OR readonly array
 * - { values } (single-select) → the literal string union
 * - { map } (custom map) → string (passed through the map function at runtime)
 */
export type ModifierValueOf<D extends ModifierDef> = D extends true
  ? boolean
  : D extends readonly (infer V extends string)[]
    ? V
    : D extends { values: readonly (infer V extends string)[]; multi: true }
      ? V | readonly V[]
      : D extends { values: readonly (infer V extends string)[] }
        ? V
        : D extends { map: (value: string) => string }
          ? string
          : never;

/**
 * Maps a full ModifierSchema to a partial object type describing the valid
 * modifier inputs for a block or element call.
 *
 * - When the schema is non-empty, each key is optional and typed by ModifierValueOf.
 * - When the schema has no keys (empty — no modifiers defined), falls back to
 *   `Record<string, unknown>` so backward-compat unschematised blocks continue
 *   to accept arbitrary modifier objects without compile-time errors.
 */
export type ModifierInput<M extends ModifierSchema> = [keyof M] extends [never]
  ? Record<string, unknown>
  : {
      [K in keyof M]?: ModifierValueOf<M[K]>;
    };

// ---------------------------------------------------------------------------
// Element schema types (implemented in CORE-02)
// ---------------------------------------------------------------------------

/** Per-element configuration including element-scoped modifiers and inheritance. */
export interface ElementConfig {
  modifiers?: ModifierSchema;
  /**
   * Block-level modifier keys this element inherits.
   * Listed keys from the block's ModifierSchema become available on this
   * element call in addition to the element's own modifiers. Use
   * `as const` on the array to get compile-time enforcement of the keys.
   */
  inherit?: readonly string[];
}

// ---------------------------------------------------------------------------
// Element-call modifier constraint helpers (CORE-03)
// ---------------------------------------------------------------------------

/**
 * Extracts the concrete ElementConfig sub-type for a specific element name
 * from a record-form elements schema. Returns `never` for array schemas or
 * any schema that does not resolve the element via a record key.
 *
 * Brackets around the conditional (`[_E] extends [...]`) suppress distribution
 * so that union schemas like `ElementsSchema` correctly resolve to `never`
 * rather than being distributed into a union result.
 */
type ExtractElementConfig<_E extends ElementsSchema, Elem extends string> =
  [_E] extends [Record<Elem, infer Config>]
    ? Config extends ElementConfig
      ? Config
      : never
    : never;

/**
 * Resolves the modifier input type permitted for a specific element call.
 *
 * - Record-schema elements: only the element's own `modifiers` schema is
 *   accepted. Keys absent from the element's schema are NOT allowed (disjoint
 *   by default — Decision D2).
 * - Array-schema or no-schema: no per-element modifier constraint; any
 *   modifier input is accepted (backward-compat with CORE-01/02).
 *
 * Inherited block-level modifiers are enforced at runtime but are not yet
 * reflected in this type (full type-level inherit support is CORE-10).
 */
export type ElementCallModifiers<
  _E extends ElementsSchema,
  Elem extends string,
  _M extends ModifierSchema,
> =
  // ExtractElementConfig returns `never` for array/no-schema — permit anything.
  [ExtractElementConfig<_E, Elem>] extends [never]
    ? Record<string, unknown>
    : // Record-schema element: restrict to its own modifier input.
      ModifierInput<
        NonNullable<ExtractElementConfig<_E, Elem>['modifiers']> extends ModifierSchema
          ? NonNullable<ExtractElementConfig<_E, Elem>['modifiers']>
          : Record<never, ModifierDef>
      >;

/** Elements schema: either an array of element name strings or a record of configs. */
export type ElementsSchema = readonly string[] | Record<string, ElementConfig>;

/**
 * Resolves the union of valid element name strings from an elements schema.
 *
 * - Array form `['header', 'body']` → `'header' | 'body'`
 * - Record form `{ header: ..., body: ... }` → `'header' | 'body'`
 * - Base type `ElementsSchema` (or no schema) → `string` (no constraint)
 */
export type ElementName<E extends ElementsSchema> =
  E extends readonly (infer K extends string)[]
    ? K
    : E extends Record<infer K extends string, ElementConfig>
      ? K
      : string;

// ---------------------------------------------------------------------------
// block() config shapes
// ---------------------------------------------------------------------------

/**
 * Configuration for wrapper mode: `block(cssModuleImport, WrapperConfig)`.
 * Wraps an existing CSS Module file with a typed BEM schema.
 */
export interface WrapperConfig<
  _E extends ElementsSchema = ElementsSchema,
  _M extends ModifierSchema = ModifierSchema,
> {
  elements?: _E;
  modifiers?: _M;
  /** CSS naming convention used in the module file. Defaults to 'auto'. */
  naming?: 'auto' | 'camel' | 'dashes' | 'bem';
  /**
   * The key in the CSS Module object that represents the block root class.
   * When omitted, the first key of the styles object is used as a heuristic.
   * Prefer setting this explicitly when the root key may not be first.
   */
  rootKey?: string;
}

/**
 * Configuration for author mode: `block(name, AuthorConfig?)`.
 * Generates scoped BEM class strings from a block name.
 */
export interface AuthorConfig<
  _E extends ElementsSchema = ElementsSchema,
  _M extends ModifierSchema = ModifierSchema,
> {
  elements?: _E;
  modifiers?: _M;
  /** Injected by @elemia/plugin-vite at build time. Used for deterministic hash scope. */
  __filePath?: string;
  /** Optional salt for the hash scope (injected by build plugin). */
  __salt?: string;
}

// ---------------------------------------------------------------------------
// BlockDescriptor
// ---------------------------------------------------------------------------

/**
 * Serializable descriptor attached to every BlockHelper.
 * Consumed by framework adapters for SSR hydration assertions.
 */
export interface BlockDescriptor<
  E extends ElementsSchema = ElementsSchema,
  M extends ModifierSchema = ModifierSchema,
> {
  /** The original block name passed to block(). */
  name: string;
  /** Whether this is a wrapper or author block. */
  mode: 'wrapper' | 'author';
  /**
   * The scoped class name used as the block root in author mode
   * (populated by CORE-06 hash engine). Null in wrapper mode or before CORE-06.
   */
  scopedName: string | null;
  /** Flattened list of element names from the schema. */
  elements: readonly ElementName<E>[];
  /** The modifier schema passed to block(). */
  modifiers: M;
}

// ---------------------------------------------------------------------------
// BlockHelper — callable type with attached properties
// ---------------------------------------------------------------------------

/**
 * The callable helper returned by block().
 *
 * Signatures:
 *   b(element, modifiers?, ...extra)  — generates a BEM element class string
 *   b(null, modifiers?, ...extra)     — generates a BEM block root class string
 *
 * Properties:
 *   b.styles   — the CSS Module import object (wrapper mode) or null (author mode)
 *   b.root()   — alias for b(null, ...)
 *   b.has()    — runtime guard: true if the key exists in styles (wrapper) else false
 *   b.descriptor — serializable block metadata
 */
export interface BlockHelper<
  _E extends ElementsSchema = ElementsSchema,
  _M extends ModifierSchema = ModifierSchema,
> {
  // Root call: b(null | undefined, modifiers?, ...extra)
  // Accepts block-level modifiers typed against the full ModifierSchema.
  (
    element: null | undefined,
    modifiers?: ModifierInput<_M>,
    ...extra: ClassInput[]
  ): string;

  // Element call: b(element, modifiers?, ...extra)
  // Accepts only the element's own modifiers (disjoint — D2). Generic on Elem
  // so TypeScript can infer the element name and compute the allowed modifiers.
  <Elem extends ElementName<_E>>(
    element: Elem,
    modifiers?: ElementCallModifiers<_E, Elem, _M>,
    ...extra: ClassInput[]
  ): string;

  /** The underlying CSS Module object in wrapper mode; null in author mode. */
  styles: Record<string, string> | null;

  /** Named alias for b(null, modifiers?, ...extra). */
  root(modifiers?: ModifierInput<_M>, ...extra: ClassInput[]): string;

  /**
   * Runtime guard: returns true if the resolved CSS Module key exists in the styles
   * object (wrapper mode); always returns false in author mode.
   */
  has(element: string, modifier?: string, value?: string): boolean;

  /** Serializable descriptor for SSR hydration and tooling. */
  descriptor: BlockDescriptor<_E, _M>;
}
