# @elemia/svelte

Svelte adapter for [Elemia](https://github.com/intechnible/elemia) — action-based CSS-in-JS style injection.

## Usage

```svelte
<script>
  import { styleAction } from '@elemia/svelte';
  import { cardSheet } from './card.styles';
</script>

<div use:styleAction={cardSheet}>
  ...
</div>
```

## CSP Nonce

Svelte does not have a built-in dependency injection system (like React context or Vue's `provide/inject`), so the CSP nonce is configured via a module-level `setNonce()` call.

Call `setNonce()` **once** during application startup, before any component using `styleAction` is mounted:

```ts
import { setNonce } from '@elemia/svelte';

// Read nonce from your server-rendered HTML (e.g., a meta tag or inline script)
const nonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ?? '';
setNonce(nonce);
```

All subsequent `styleAction` invocations will use this nonce when creating `<style>` elements.

If `setNonce()` is never called, styles are injected without a `nonce` attribute (safe for development; ensure your CSP policy is configured appropriately for production).

## Ref-counting

Multiple elements bound to the same `StyleSheet` (same `blockName`) share one `<style>` tag. The tag is removed from the DOM only when the last element using it is destroyed.
