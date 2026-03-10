# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-03-10

Initial release of the Elemia monorepo. All packages are published at `0.1.0`.

### @elemia/core

#### Added
- `block()` factory with two overloads:
  - **Wrapper mode** — `block(cssModuleImport, config)` wraps existing CSS Modules with a typed schema, zero CSS changes required
  - **Author mode** — `block(blockName, config)` generates deterministically scoped BEM class names
- `BlockHelper` interface returned by `block()`:
  - `b(element, modifiers?, ...extras)` — primary call signature for root and element classes
  - `b.root(modifiers?, ...extras)` — explicit root alias
  - `b.has(element, modifier?, value?)` — runtime guard for partial adoption safety
  - `b.styles` — raw CSS Module passthrough (`null` in author mode)
  - `b.descriptor` — `BlockDescriptor` for SSR and tooling metadata
- Four modifier types: boolean, enum (`string[]`), multi-select (`{ values, multi }`), and custom map (`{ map: fn }`)
- Element configuration via array form or record form with per-element modifiers and `inherit` for explicit block-modifier bridging
- CSS naming convention auto-detection: `'auto' | 'camel' | 'dashes' | 'bem'` with per-block override
- Deterministic author-mode scoping using djb2a hash over `salt::normalizedFilePath::blockName` (6-char base-36 suffix)
- `cx()` utility for class name deduplication and merging
- `getScopedName(descriptor)` — extracts scoped name from a `BlockDescriptor`
- `sanitizeBlockName()` — normalizes block names to safe ASCII kebab-case
- `normalizePath()` — cross-OS deterministic path normalization (POSIX, lowercased) for reproducible hashes
- Stable, alphabetically sorted class output for all modifier keys
- WeakMap-cached naming convention resolver with intelligent fallback per CSS Module import
- Full TypeScript inference: element names and modifier values are statically typed from the schema
- Bundle size targets enforced: wrapper-only ≤ 2 KB, full core ≤ 3 KB (minified + gzipped)

### @elemia/styles

#### Added
- `styles(definition, options)` — CSS-in-JS stylesheet factory using camelCase JS objects
- `StyleSheet` interface with `blockName`, `css`, `definition`, optional `layer`, optional `theme`
- `@layer` support via `options.layer`
- Design token system via `options.theme.tokens` with strict validation
- `serialize()` and `serializeTokens()` CSS serialization utilities
- `generateTheme(tokens, options)` — generates CSS custom properties from a token map
- Zero runtime dependencies

### @elemia/react

#### Added
- `useBlock(sheet)` — React hook integrating a `StyleSheet` with lifecycle, handles SSR style collection
- `StyleProvider` — context provider with CSP nonce support and SSR style buffer
- `StyleContext` — context for nonce propagation and style collection
- `ServerStyles` — component for rendering collected styles in SSR document head / streaming

### @elemia/vue

#### Added
- `useBlock(sheet)` — Vue 3 composable for reactive style injection with ref-counting and automatic cleanup
- `StyleProvider` — provide/inject based nonce and style collection component
- `ELEMIA_NONCE_KEY` — symbol for nonce injection via Vue's provide/inject

### @elemia/svelte

#### Added
- `styleAction` — Svelte action for style injection with ref-counting and cleanup
- `setNonce(nonce)` — module-level CSP nonce configuration

### @elemia/solid

#### Added
- `createBlock(sheet)` — SolidJS reactive primitive for style mounting with cleanup
- `ElemiaContext` — context for nonce propagation throughout the component tree

### @elemia/vanilla

#### Added
- `mount(sheet, options?)` — injects a `StyleSheet` as a `<style>` element with ref-counting
- Returns an `unmount` function to remove the style element when no longer needed
- Options: `target` (defaults to `document.head`), `nonce`

### @elemia/plugin-vite

#### Added
- `elemia(options)` — Vite plugin for build-time integration
- AST traversal via acorn to find `block()` call sites and inject `__filePath` for deterministic scoping
- Static CSS extraction from author-mode `styles()` definitions at build time
- Dev overlay for resolver diagnostics during development
- Source map generation for extracted styles
- Options: `salt` (hash scope salt), `devOverlay` (boolean)
- Exports: `findCallSites`, `injectFilePath`, `extractStyles`, `createResolverOverlayMessage`

### @elemia/cli

#### Added
- `elemia generate-types` — infers a typed BEM schema from a CSS file and generates `.d.ts` output with `// REVIEW` hints for ambiguous cases
- `elemia check` — validates block schemas against CSS files; `--strict` flag for CI enforcement
- `elemia manifest` — generates a JSON manifest of all blocks, elements, and modifiers in a directory
- `elemia compare` — diffs generated CSS output against the original file to validate migrations
- `elemia convert` — codemod that converts CSS to `styles()` format, outputting to `__converted__/` by default
- Exports: `parseCSS`, `extractClassNames`, `inferSchema`, `diffSemanticClasses`

### @elemia/eslint-plugin

#### Added
- `elemia/no-template-classnames` — flags template literal expressions used to join class names and suggests migration to `block()`
- `elemia/consistent-block-usage` — opt-in rule enforcing per-file consistency between wrapper-mode and raw class name usage
- `elemia.configs.recommended` — recommended rule configuration

---

## Design Decisions (v0.1.0)

Key architectural decisions established in this release:

- **D2 — Element modifier disjoint by default:** element modifiers are separate from block modifiers; opt-in inheritance via `inherit: [...]`
- **D5 — Coexistence as first-class:** raw `styles.foo` access coexists with typed `b()` calls; no all-or-nothing migration
- **D9 — Wrapper-first architecture:** primary adoption path wraps existing CSS Modules with no CSS changes required
- **D10 — Auto-resolver with caching:** WeakMap caches naming convention per CSS Module import for zero-overhead resolution

---

[0.1.0]: https://github.com/intechnible/elemia/releases/tag/v0.1.0
