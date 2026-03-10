# Stage 1 in 15 Minutes

This guide shows a single-component migration from raw CSS Modules usage to Elemia wrapper mode in React.

## 1. Install

```bash
pnpm add @elemia/core
```

## 2. Before: direct CSS Module access

```tsx
import styles from './Card.module.css';

export function Card({ title, body }: { title: string; body: string }) {
  return (
    <article className={styles.card}>
      <h2 className={styles.card__title}>{title}</h2>
      <p className={styles.card__body}>{body}</p>
    </article>
  );
}
```

## 3. After: wrap with `block()`

```tsx
import { block } from '@elemia/core';
import styles from './Card.module.css';

const b = block(styles, {
  naming: 'bem',
  elements: ['title', 'body'] as const,
});

export function Card({ title, body }: { title: string; body: string }) {
  return (
    <article className={b.root()}>
      <h2 className={b('title')}>{title}</h2>
      <p className={b('body')}>{body}</p>
    </article>
  );
}
```

## 4. Type safety check

```tsx
b('title'); // ok
b('nonexistent'); // TypeScript error
```

Expected compile error shape:

```text
Argument of type '"nonexistent"' is not assignable to parameter of type '"title" | "body"'.
```

## 5. Keep migration small

You can migrate one component at a time. Wrapper mode preserves your existing `.module.css` files.

If your project uses a different CSS Modules key format, set the `naming` option accordingly. See `docs/cookbook/resolver-cookbook.md` for the full convention matrix and troubleshooting.
