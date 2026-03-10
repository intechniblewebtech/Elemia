# Elemia

**Runtime-agnostic typed BEM class generation framework.**

Elemia wraps your existing CSS Modules (or generates scoped classes from scratch) and exposes a fully type-safe, autocomplete-friendly API for building and applying BEM class names. It works in any framework — React, Vue, Svelte, SolidJS, or plain JavaScript — and integrates with Vite and ESLint for a complete developer experience.

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@elemia/core`](packages/core) | 0.1.0 | Core `block()` factory and type system |
| [`@elemia/styles`](packages/styles) | 0.1.0 | CSS-in-JS stylesheet authoring factory |
| [`@elemia/react`](packages/react) | 0.1.0 | React adapter — `useBlock`, `StyleProvider`, SSR |
| [`@elemia/vue`](packages/vue) | 0.1.0 | Vue 3 composable adapter — `useBlock`, `StyleProvider` |
| [`@elemia/svelte`](packages/svelte) | 0.1.0 | Svelte action adapter — `styleAction` |
| [`@elemia/solid`](packages/solid) | 0.1.0 | SolidJS reactive primitive — `createBlock` |
| [`@elemia/vanilla`](packages/vanilla) | 0.1.0 | Vanilla JS style injection — `mount` |
| [`@elemia/plugin-vite`](packages/plugin-vite) | 0.1.0 | Vite plugin — path injection, CSS extraction, dev overlay |
| [`@elemia/cli`](packages/cli) | 0.1.0 | CLI — schema inference, validation, migration tooling |
| [`@elemia/eslint-plugin`](packages/eslint-plugin) | 0.1.0 | ESLint rules for migration and usage enforcement |

---

## Why Elemia?

BEM is a proven CSS naming methodology, but applying it manually is error-prone and produces untyped, stringly-typed class name logic scattered throughout components. Elemia solves this by:

- **Type safety** — your element names and modifier values are statically inferred from a schema; typos are caught at compile time.
- **Wrapper-first adoption** — wrap your existing CSS Modules in a single call with zero CSS changes required.
- **Gradual migration** — move from typed wrapper → authored styles → statically extracted CSS at your own pace (three-stage model).
- **Framework portability** — a tiny core (~2 KB gzipped) with thin framework adapters for ref-counted style injection and SSR.
- **Deterministic scoping** — author-mode blocks are scoped with a djb2a hash of their file path and block name, reproducible across environments.

---

## Installation

```sh
# Core only (wrapper mode)
pnpm add @elemia/core

# With a framework adapter
pnpm add @elemia/core @elemia/styles @elemia/react

# Build plugin (add to devDependencies)
pnpm add -D @elemia/plugin-vite
```

---

## Quick Start

### Stage 1 — Wrap Existing CSS Modules

No CSS changes required. Elemia wraps your existing module and adds type safety.

```ts
// card.ts
import styles from './Card.module.css'
import { block } from '@elemia/core'

const b = block(styles, {
  elements: ['title', 'body', 'footer'] as const,
  modifiers: {
    size: ['sm', 'md', 'lg'] as const,
    disabled: true,
  },
})

// Usage
b.root()                          // → 'card'
b('title')                        // → 'card__title'
b(null, { size: 'lg' })           // → 'card card--size-lg'
b('body', { disabled: true })     // → 'card__body card__body--disabled'
b.has('title')                    // → true (runtime element guard)
```

### Stage 2 — Author Styles in JavaScript

Define your CSS inside `styles()` alongside your schema, then reference it with `block()`.

```ts
import { block } from '@elemia/core'
import { styles } from '@elemia/styles'

const sheet = styles({
  root: { display: 'flex', gap: '1rem' },
  title: { fontSize: '1.25rem', fontWeight: 700 },
}, { blockName: 'card' })

const b = block('card', {
  __filePath: import.meta.url,
  elements: ['title'] as const,
  modifiers: { size: ['sm', 'md', 'lg'] as const },
})
```

### Stage 3 — Static CSS Extraction (with Vite Plugin)

Add `@elemia/plugin-vite` to extract CSS at build time.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { elemia } from '@elemia/plugin-vite'

export default defineConfig({
  plugins: [elemia()],
})
```

The plugin injects `__filePath` automatically and extracts authored styles to static CSS.

---

## Framework Adapters

### React

```tsx
import { useBlock } from '@elemia/react'

function Card({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const b = useBlock(sheet)
  return <div className={b(null, { size })}>{/* ... */}</div>
}
```

For SSR, wrap your app with `StyleProvider` and render `ServerStyles` in your document head.

```tsx
import { StyleProvider, ServerStyles } from '@elemia/react'

// In your SSR entry:
<StyleProvider>
  <App />
</StyleProvider>

// In your document <head>:
<ServerStyles />
```

### Vue 3

```ts
import { useBlock } from '@elemia/vue'

const b = useBlock(sheet)
```

### Svelte

```svelte
<script>
  import { styleAction } from '@elemia/svelte'
</script>

<div use:styleAction={sheet}>...</div>
```

### SolidJS

```ts
import { createBlock } from '@elemia/solid'

const b = createBlock(sheet)
```

### Vanilla JS

```ts
import { mount } from '@elemia/vanilla'

const unmount = mount(sheet, { target: document.head })
// Call unmount() to remove styles when done
```

---

## Modifier System

Elemia supports four modifier types:

```ts
const b = block('card', {
  modifiers: {
    // Boolean: applies '--disabled' or nothing
    disabled: true,

    // Enum: applies '--size-lg' etc.
    size: ['sm', 'md', 'lg'] as const,

    // Multi-select: accepts single string or array
    tags: { values: ['a', 'b', 'c'] as const, multi: true },

    // Custom map: full control
    theme: { map: (v) => v.toLowerCase() },
  },
})

b(null, { disabled: true })         // → 'card card--disabled'
b(null, { size: 'lg' })             // → 'card card--size-lg'
b(null, { tags: ['a', 'b'] })       // → 'card card--tags-a card--tags-b'
```

Modifiers are always output in **alphabetical key order** for deterministic class strings.

---

## Elements

Elements can be declared as an array or a record for fine-grained control:

```ts
const b = block(styles, {
  // Array form (no element-level modifiers)
  elements: ['title', 'body'] as const,

  // Record form (with per-element modifiers and inheritance)
  elements: {
    title: {
      modifiers: { truncated: true },
      inherit: ['disabled'],           // inherit block-level 'disabled' modifier
    },
  },
})
```

---

## CLI Tooling

```sh
# Infer a typed schema from a CSS file
elemia generate-types src/Card.module.css

# Validate schema against CSS in CI
elemia check src/ --strict

# Generate a JSON manifest of all blocks
elemia manifest src/

# Compare generated output against original CSS
elemia compare src/Card.module.css

# Convert CSS to styles() format
elemia convert src/Card.module.css
```

---

## ESLint Plugin

```js
// eslint.config.js
import elemia from '@elemia/eslint-plugin'

export default [
  elemia.configs.recommended,
]
```

**Rules:**
- `elemia/no-template-classnames` — flags template literals joining class names, suggests `block()` migration
- `elemia/consistent-block-usage` — enforces all-wrapper or all-raw consistency per file (opt-in)

---

## Scoping in Author Mode

Author-mode blocks are scoped deterministically using a djb2a hash:

```
hash input:  salt::normalizedFilePath::blockName
hash output: blockName_abc123   (6 chars, base-36)
```

The Vite plugin injects the file path at build time. In development without the plugin, Elemia falls back to a name-only hash and logs a console warning.

---

## Bundle Size

| Mode | Size (min+gzip) |
|------|----------------|
| Wrapper mode only | ≤ 2 KB |
| Core (both modes) | ≤ 3 KB |

---

## Requirements

- Node.js >= 18
- pnpm >= 9
- TypeScript >= 5.0 (for full type inference)

---

## Documentation

- [Philosophy](docs/elemia-philosophy.md) — design rationale and architectural decisions
- [Stage 1 Quickstart](docs/cookbook/stage-1-quickstart.md) — 5-minute wrapper mode guide
- [Migration Guide](docs/cookbook/migration-guide.md) — moving from raw class names to Elemia
- [Resolver Cookbook](docs/cookbook/resolver-cookbook.md) — CSS naming convention handling
- [SSR Hashing Checklist](docs/cookbook/ssr-hashing-checklist.md) — server-side rendering guide
- [Partial Adoption](docs/cookbook/partial-adoption.md) — coexistence with existing code
- [Decision Log](docs/planning/DECISION-LOG.md) — architectural decisions and rationale

---

## License

MIT
