# Partial Adoption Patterns

Partial adoption lets teams migrate safely without freezing feature work. These patterns are valid, but temporary by design.

## 1. Mix `b()` and direct `styles.foo`

```tsx
import { block } from '@elemia/core';
import styles from './Card.module.css';

const b = block(styles, { elements: ['title'] as const, naming: 'bem' });

export function Card({ emphasized }: { emphasized: boolean }) {
  return (
    <article className={emphasized ? styles.cardHighlight : b.root()}>
      <h2 className={b('title')}>Title</h2>
    </article>
  );
}
```

Trade-off: fast migration start, but mixed patterns increase review and lint complexity.

## 2. Multi-root CSS Modules

One CSS Module can hold more than one conceptual block during transition.

```ts
const modal = block(styles, { elements: ['body'] as const, naming: 'bem' });
const overlay = block(styles, { elements: ['backdrop'] as const, naming: 'bem' });
```

Trade-off: fewer files immediately, but naming collisions are easier to introduce.

## 3. `b.has()` guard for migration safety

```tsx
const cls = b.has('title', 'size', 'lg') ? b('title', { size: 'lg' }) : b('title');
```

Use this when schema and CSS are temporarily out of sync.

## Recommendation

Treat partial adoption as a short-lived state:

1. Use `@elemia/eslint-plugin` rule `no-template-classnames` to block backsliding.
2. Use `@elemia/eslint-plugin` rule `consistent-block-usage` to enforce one style per file when ready.
3. Remove direct `styles.foo` access once each file is migrated.
