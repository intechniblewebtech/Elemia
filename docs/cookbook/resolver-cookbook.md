# Resolver Cookbook

Use this guide to align `block(styles, config)` with your CSS Modules key format and debug resolver misses.

## Naming Modes

### `naming: 'bem'`

```ts
const b = block(styles, { naming: 'bem' });
b('title', { size: 'lg' });
// resolves keys like: card__title, card__title--size-lg
```

### `naming: 'camel'`

```ts
const b = block(styles, { naming: 'camel' });
b('title', { size: 'lg' });
// resolves keys like: cardTitle, cardTitleSizeLg
```

### `naming: 'dashes'`

```ts
const b = block(styles, { naming: 'dashes' });
b('title', { size: 'lg' });
// resolves keys like: card-title, card-title-size-lg
```

### `naming: 'auto'`

```ts
const b = block(styles, { naming: 'auto' });
// tries known strategies in order and caches hits
```

## Vite `localsConvention` Mapping

| CSS Modules `localsConvention` | Elemia `naming` |
| --- | --- |
| `camelCase` | `camel` |
| `camelCaseOnly` | `camel` |
| `dashes` | `dashes` |
| `dashesOnly` | `dashes` |
| default/BEM-like keys | `bem` |
| mixed or uncertain project | `auto` |

## Resolver Miss Debugging

Typical runtime error includes:

- block name
- requested element/modifier
- attempted key variants
- available keys from imported `styles`

Interpretation flow:

1. Confirm the class exists in the CSS Module output keys.
2. Verify `naming` matches your bundler `localsConvention`.
3. If naming varies across files, start with `auto`, then normalize conventions later.

## Useful APIs

- `autoResolver(styles, blockName, element, modifier)` for direct diagnostics.
- `resetResolverCache()` after hot reloading or test isolation boundaries.

```ts
import { autoResolver, resetResolverCache } from '@elemia/core';

resetResolverCache();
const resolved = autoResolver(styles, 'card', 'title', 'size-lg');
```
