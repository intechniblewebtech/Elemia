# SSR + Hashing Checklist

Use this checklist when running Elemia author mode in SSR apps (Next.js, Remix, Astro, or any Vite-based SSR setup). Each item states a clear pass criterion and a failure symptom so you can diagnose problems quickly.

## Prerequisites

- `@elemia/plugin-vite` installed in your project
- `@elemia/react` installed (for React SSR; see the SolidJS section for `@elemia/solid`)
- Author mode in use: components call `block('name', config)` (string first argument)
- Vite 5+ as your bundler for both client and SSR builds

---

## Checklist

### 1. Vite Plugin Included in the Build

- [ ] **Item**: `@elemia/plugin-vite` is registered in your Vite config and applies to both the client build and the SSR build.
  - **Pass**: The SSR build output contains `block(` calls with injected `__filePath` and `__salt` fields. Inspect the compiled SSR bundle or enable verbose logging.
  - **Fail**: `block()` in production emits a console warning: `block('name') has no __filePath - using name-only hash`. Class names differ between server and client.

The plugin automatically detects SSR context via Vite's internal `config.command`; you do not pass an `ssr` flag. Register it once and it covers both pipelines:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { elemia } from '@elemia/plugin-vite';

const salt = process.env.ELEMIA_SALT ?? '';

export default defineConfig({
  plugins: [elemia({ salt })],
});
```

> If your framework requires separate Vite configs for client and SSR (for example some Remix setups), add the `elemia({ salt })` plugin to **both** config files using the same `salt` value.

---

### 2. Salt Matches Across SSR and Client

- [ ] **Item**: The `salt` value passed to `elemia()` is identical in every build target.
  - **Pass**: A block rendered on the server and the same block hydrated on the client resolve to the same scoped class name (e.g. `card_2kx9f1`).
  - **Fail**: Hydration mismatch warnings in the browser console; server-rendered HTML has a different class suffix than the client-rendered replacement.

Use a single environment variable as the authoritative salt source:

```ts
// vite.config.ts
const salt = process.env.ELEMIA_SALT ?? '';

export default defineConfig({
  plugins: [elemia({ salt })],
});
```

Verification: render the same block in a test SSR pass and a client pass, then compare the `blockName` value on the returned `StyleSheet` from `@elemia/styles`.

---

### 3. Windows Path Normalization

- [ ] **Item**: The Vite plugin normalizes file paths to lowercase POSIX format before computing hashes.
  - **Pass**: The same `.block.ts` file hashes identically on a Windows developer machine and a Linux CI runner.
  - **Fail**: Class name suffixes differ between environments; styles go missing in production builds built on Linux from a Windows-authored project.

The plugin's `normalizePath` function (in `packages/plugin-vite/src/inject.ts`) applies `filePath.replace(/\\/g, '/').toLowerCase()` before embedding `__filePath`. The core `hashScope` function in `@elemia/core` applies the same normalization. No developer action is required — this is automatic.

Verification command (run on both platforms):

```bash
pnpm --filter @elemia/plugin-vite test
```

If you maintain a custom build script that constructs file paths manually, ensure you apply the same transforms: replace all `\` with `/` and convert to lowercase before passing to any Elemia API.

---

### 4. `StyleProvider` Wraps the SSR Component Tree

`StyleProvider` is the REACT-02 component. It creates the style collection buffer used during server-side rendering.

- [ ] **Item**: The top-level server render entry wraps the entire application in `<StyleProvider>`.
  - **Pass**: The `ssrBuffer` inside `StyleProvider` is populated during render. `ServerStyles` can read collected styles and emit `<style>` tags.
  - **Fail**: `ServerStyles` renders nothing; no `<style data-elemia-block="...">` tags appear in the SSR HTML output.

```tsx
// server-entry.tsx
import { StyleProvider } from '@elemia/react';
import { App } from './App';

export function AppShell() {
  return (
    <StyleProvider nonce={process.env.CSP_NONCE}>
      <App />
    </StyleProvider>
  );
}
```

`StyleProvider` accepts an optional `nonce` string that is propagated to every injected `<style>` tag. Pass the per-request CSP nonce here.

---

### 5. `ServerStyles` Is Placed Inside `<head>`

`ServerStyles` is the REACT-03 component. It reads the `ssrBuffer` collected by `StyleProvider` and renders one `<style data-elemia-block="...">` tag per block.

- [ ] **Item**: `<ServerStyles />` is rendered inside `<head>` before `</head>` closes.
  - **Pass**: The server-rendered HTML document contains `<style data-elemia-block="card">...</style>` (and one tag per block) inside `<head>`. The browser applies block styles before first paint without FOUC.
  - **Fail**: Styles appear after `<body>` or are absent; the browser shows a flash of unstyled content on first load, or `<ServerStyles />` renders `null` because it is outside `StyleProvider`'s context.

```tsx
// Document.tsx
import { ServerStyles } from '@elemia/react';

export function Document({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <ServerStyles />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`ServerStyles` must be a descendant of `StyleProvider` in the React tree. The document shell component is typically where both are composed together.

---

### 6. CSP Nonce Propagation

- [ ] **Item**: The nonce passed to `StyleProvider` matches the value used in your `Content-Security-Policy` header for the current request.
  - **Pass**: Every `<style>` tag emitted by `ServerStyles` carries `nonce="<expected-value>"`. The browser does not block any Elemia style tags.
  - **Fail**: Browser console shows CSP violations for `<style>` tags; styles are blocked and components render without their scoped classes.

```tsx
// Per-request nonce injection example (framework-agnostic pseudocode)
const nonce = generateCspNonce(); // e.g. crypto.randomBytes(16).toString('base64')

const html = renderToString(
  <StyleProvider nonce={nonce}>
    <App />
  </StyleProvider>
);
// Use the same nonce value in the CSP header sent with the response.
```

---

### 7. SolidJS SSR — Special Case

`@elemia/solid`'s `createBlock()` relies on `createEffect` from `solid-js`. In the Solid server build, effects are no-ops: `createEffect` does not execute its callback during SSR. This means `createBlock()` does **not** inject styles during a SolidJS SSR render pass.

- [ ] **Item**: The SolidJS SSR pipeline manually collects `StyleSheet` CSS values and writes them into the server-rendered HTML, bypassing `createBlock()` entirely.
  - **Pass**: The server-rendered HTML response contains the required style text in a `<style>` tag, even though `createBlock()` did not run.
  - **Fail**: SolidJS SSR HTML has no Elemia styles; styles only appear after client-side hydration, causing FOUC.

Workaround — collect sheets manually in the SSR render function:

```ts
// solid-ssr-entry.ts
import type { StyleSheet } from '@elemia/styles';
import { renderToString } from 'solid-js/web';
import { App } from './App';

/**
 * Injects collected StyleSheet CSS into the server-rendered document.
 * Call this instead of relying on createBlock() for SSR.
 */
export function renderWithStyles(sheets: StyleSheet[]): string {
  const appHtml = renderToString(() => <App />);

  const styleTags = sheets
    .map(sheet => `<style data-elemia-block="${sheet.blockName}">${sheet.css}</style>`)
    .join('\n');

  return `<!doctype html><html><head>${styleTags}</head><body>${appHtml}</body></html>`;
}
```

Collect `StyleSheet` objects from the `styles()` calls used in your components and pass them to `renderWithStyles`. Because `createBlock()` is a DOM operation, it must not be called at all on the server — only `renderWithStyles` (or equivalent) should handle style injection in your SSR entry point.

---

### 8. End-to-End Stability Verification

- [ ] **Item**: A complete SSR render followed by client hydration produces no mismatches.
  - **Pass**: No React hydration mismatch warnings in the browser console. Class suffixes on server-rendered DOM nodes match the class strings computed during client hydration.
  - **Fail**: React logs `Warning: Prop 'className' did not match`; visible style flicker or layout shift on hydration.

Run this check in CI on every merge:

```bash
# Run SSR integration tests for the React adapter
pnpm --filter @elemia/react test

# Run Vite plugin path injection tests
pnpm --filter @elemia/plugin-vite test
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `block('x') has no __filePath` warning in console | `@elemia/plugin-vite` is missing from the build config | Add `elemia({ salt })` to `plugins` in `vite.config.ts` |
| Class suffix differs between server and client | `salt` mismatch between builds, or path normalization issue on Windows | Ensure a single `ELEMIA_SALT` env var is used; verify `normalizePath` is applied |
| `<ServerStyles />` renders nothing | `StyleProvider` is absent, or `ServerStyles` is outside its React subtree | Wrap the entire SSR tree with `<StyleProvider>` and place `<ServerStyles />` inside it |
| SolidJS SSR has no styles | `createBlock()` is a no-op on server | Use the manual `StyleSheet.css` collection workaround described in item 7 |
| CSP violations for `<style>` tags | Nonce not propagated to `StyleProvider`, or nonce in CSP header does not match | Pass the per-request nonce to `StyleProvider nonce={nonce}` |
| Hash drift between Windows dev and Linux CI | File paths contain uppercase or backslashes before reaching `hashScope` | Let the Vite plugin handle path injection; avoid manual `__filePath` strings |

---

Reference: `docs/cookbook/stage-1-quickstart.md`, `docs/cookbook/migration-guide.md`.
