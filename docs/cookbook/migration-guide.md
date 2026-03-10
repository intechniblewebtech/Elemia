# Migration Guide: Stage 1 (Wrapper Mode) → Stage 2 (Author Mode)

## Overview

Stage 1 (wrapper mode) keeps your existing `.module.css` files and layers `block()` on top of them for type safety. Stage 2 (author mode) replaces `.module.css` files with TypeScript `styles()` definitions, giving you collocated styles, theme channels, and CSS layers — all without a separate stylesheet.

This guide walks through the automated codemod workflow that converts Stage 1 CSS Modules into Stage 2 `.block.ts` files, verifies semantic equivalence, and cleans up the originals. The original `.module.css` files are never modified by default, making rollback trivial.

## Prerequisites

- `@elemia/core` is installed and your project is already in Stage 1 (see [Stage 1 Quickstart](./stage-1-quickstart.md))
- `@elemia/cli` is installed in the workspace:
  ```bash
  pnpm add -D @elemia/cli
  ```
- A clean git commit baseline before starting

## Step-by-Step Migration

### Step 1: Run the Converter

Run `elemia convert` against your source directory. By default the converter operates in non-destructive mode: it writes converted files into a `__converted__/` subdirectory next to each source file and never touches the originals.

```bash
elemia convert ./src
```

You can also target a specific glob pattern:

```bash
elemia convert 'src/**/*.module.css'
```

What happens:
- Every `.module.css` file under the target path is parsed.
- Class names are inferred using schema detection (BEM, camelCase, and mixed conventions are all recognised).
- A `.block.ts` file is generated for each CSS Module and written to `<source-dir>/__converted__/<Name>.block.ts`.
- Classes that could not be mapped confidently are annotated with a `// REVIEW:` comment in the output.

The converter emits a JSON summary to stdout listing each `sourcePath` / `outputPath` pair:

```json
[
  {
    "sourcePath": "/project/src/Card.module.css",
    "outputPath": "/project/src/__converted__/Card.block.ts"
  }
]
```

**Example input** (`src/Card.module.css`):

```css
.card {
  display: grid;
  color: #1f2937;
}

.card__title {
  font-weight: 600;
}

.card--active {
  border: 2px solid #2563eb;
}
```

**Example output** (`src/__converted__/Card.block.ts`):

```ts
import { styles } from '@elemia/styles';
import type { StyleSheet } from '@elemia/styles';

export const CardStyles: StyleSheet = styles({
  "color": "#1f2937",
  "display": "grid",
  "& .card--active": {
    "border": "2px solid #2563eb"
  },
  "& .card__title": {
    "fontWeight": "600"
  }
}, {
  blockName: "card",
});

export default CardStyles;
```

### Step 2: Review the Output

Open each generated `.block.ts` file and:

1. Resolve every `// REVIEW:` annotation. These mark class names the converter could not confidently map to a BEM role. You may need to restructure the selector or remove it if it was dead CSS.
2. Confirm that `blockName` matches the intent of the original CSS Module.
3. Verify the property objects match the original declarations — the converter is accurate for flat rules, but complex selectors (pseudo-classes, media queries, nested combinators) require manual review.

Do not delete the original `.module.css` files at this stage.

### Step 3: Verify with Compare

Use `elemia compare` to confirm semantic equivalence between a source CSS Module and its converted `.block.ts`. The command compares the set of class names that each file exposes.

```bash
elemia compare src/Card.module.css src/__converted__/Card.block.ts
```

Sample output when conversion is clean:

```
Elemia semantic diff

No semantic differences detected.
Compared classes: 3
```

Sample output when there is drift:

```
Elemia semantic diff

--- original (.module.css)
+++ converted (.block.ts)

- card--active

Summary: 1 removed, 0 added, 2 unchanged
```

Fix any removals by revisiting the converter output or manually adding the missing selector to the `.block.ts` definition before proceeding.

### Step 4: Commit and Clean Up

Once `elemia compare` reports no differences for all converted files, update your component imports to use the generated `.block.ts` files and remove the originals.

**Before (Stage 1):**

```tsx
import styles from './Card.module.css';
import { block } from '@elemia/core';

const b = block(styles, { naming: 'bem', elements: ['title'] as const });
```

**After (Stage 2):**

```tsx
import { block } from '@elemia/core';
import CardStyles from './__converted__/Card.block.ts';

const b = block(CardStyles.blockName, { elements: ['title'] as const });
```

After verifying the app renders correctly, delete the original `.module.css` files:

```bash
rm src/Card.module.css
```

Optionally move the `.block.ts` files out of `__converted__/` and into the component directory:

```bash
mv src/__converted__/Card.block.ts src/Card.block.ts
```

Only use `elemia convert --replace` when you want the converter to write `.block.ts` files directly in place of the originals (skipping `__converted__/`). Use this only after `elemia compare` has passed and you have a git safety net.

---

## Dark Mode Strategies

Stage 2 supports three dark mode strategies. Choose the one that fits your app's architecture.

### Option 1: Data Attribute (`data-theme`)

Use `generateTheme()` from `@elemia/styles` to emit `:root[data-theme="..."]` blocks. Toggle the attribute from JavaScript.

```ts
import { generateTheme } from '@elemia/styles';

const themeCss = generateTheme({
  light: {
    '--color-bg': '#ffffff',
    '--color-text': '#1f2937',
  },
  dark: {
    '--color-bg': '#0f172a',
    '--color-text': '#f8fafc',
  },
});

// Inject themeCss into a <style> tag once at app startup.
// Then toggle the theme:
document.documentElement.setAttribute('data-theme', 'dark');
```

`generateTheme()` produces:

```css
:root[data-theme="dark"] { --color-bg: #0f172a; --color-text: #f8fafc; }
:root[data-theme="light"] { --color-bg: #ffffff; --color-text: #1f2937; }
```

Consume the tokens inside a `styles()` definition via the `theme` option:

```ts
import { styles } from '@elemia/styles';

export const CardStyles = styles(
  {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
  },
  {
    blockName: 'card',
    theme: {
      tokens: {
        '--color-bg': '#ffffff',
        '--color-text': '#1f2937',
      },
    },
  },
);
```

Best when your app shell controls the `<html>` element and supports a user-selectable theme.

### Option 2: CSS `prefers-color-scheme`

Embed the media query directly inside the `styles()` definition. No JavaScript is needed.

```ts
import { styles } from '@elemia/styles';

export const CardStyles = styles(
  {
    backgroundColor: '#ffffff',
    color: '#1f2937',
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#0f172a',
      color: '#f8fafc',
    },
  },
  { blockName: 'card' },
);
```

Best when you want automatic system-level dark mode with no user toggle.

### Option 3: Class-Based

Apply a root class (`.theme-dark`) via JavaScript and scope dark tokens under it. This is useful when theme selection is driven by user preferences stored in app state.

```ts
import { styles } from '@elemia/styles';

export const CardStyles = styles(
  {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
  },
  { blockName: 'card' },
);
```

```css
/* Global theme sheet (can stay as a plain CSS file or be generated) */
:root {
  --color-bg: #ffffff;
  --color-text: #1f2937;
}

.theme-dark {
  --color-bg: #0f172a;
  --color-text: #f8fafc;
}
```

```ts
// Toggle in JavaScript
document.documentElement.classList.toggle('theme-dark', userPrefersDark);
```

Best when teams already rely on route-driven or user-session-driven theme classes.

---

## Rollback

The default `elemia convert` output writes files into `__converted__/` subdirectories and never modifies the original `.module.css` files. This makes rollback straightforward:

1. Revert your component imports to point back to the original `.module.css` files.
2. Delete the generated `__converted__/` directories.
3. Resume Stage 1 operation with no further changes required.

```bash
# Remove all generated directories
find ./src -type d -name '__converted__' -exec rm -rf {} +
```

The original `.module.css` files have not been changed and are fully usable. Only delete them after `elemia compare --strict` has passed and the Stage 2 component imports are confirmed working in production.

---

## SSR Considerations

After migrating to Stage 2, server-side rendering requires additional configuration: the Vite plugin must be present in both client and SSR build pipelines, and `StyleProvider` must wrap your server render tree.

See [SSR + Hashing Checklist](./ssr-hashing-checklist.md) for the full step-by-step setup including salt configuration, `StyleProvider`, `ServerStyles`, CSP nonce propagation, and the SolidJS SSR workaround.

---

## CI Integration

Add `elemia compare --strict` to your CI pipeline to prevent regressions. With `--strict`, the command exits with code `1` if any class names are added or removed between the source CSS and the converted `.block.ts`, failing the build.

Run a per-file comparison in CI:

```bash
elemia compare src/Card.module.css src/__converted__/Card.block.ts --strict
```

For a project with multiple converted files, loop over pairs in your CI script:

```bash
# Example: compare all converted files in a shell loop
for css_file in $(find ./src -name '*.module.css'); do
  name=$(basename "$css_file" .module.css)
  dir=$(dirname "$css_file")
  block_file="$dir/__converted__/$name.block.ts"
  if [ -f "$block_file" ]; then
    elemia compare "$css_file" "$block_file" --strict
  fi
done
```

Example GitHub Actions step:

```yaml
- name: Verify style conversion
  run: |
    for css_file in $(find ./src -name '*.module.css'); do
      name=$(basename "$css_file" .module.css)
      dir=$(dirname "$css_file")
      block_file="$dir/__converted__/$name.block.ts"
      if [ -f "$block_file" ]; then
        elemia compare "$css_file" "$block_file" --strict
      fi
    done
```

If `--strict` fails, inspect the diff output and resolve mismatches in the `.block.ts` file before merging.

---

## Completion Checklist

- [ ] `elemia convert` ran against all target directories with no unresolved `// REVIEW:` annotations
- [ ] `elemia compare --strict` passes for every converted file pair
- [ ] Component imports updated to use `.block.ts` definitions
- [ ] Dark mode strategy selected, implemented, and tested
- [ ] SSR setup validated using [SSR + Hashing Checklist](./ssr-hashing-checklist.md)
- [ ] Original `.module.css` files removed after successful verification
