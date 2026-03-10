import { defineComponent, provide, h } from 'vue';

/** Injection key for the CSP nonce. */
export const ELEMIA_NONCE_KEY = 'elemia:nonce';

/**
 * StyleProvider component.
 *
 * Wrap the application (or a subtree) with this component to propagate a CSP
 * nonce to all child `useBlock()` composables via Vue's provide/inject system.
 *
 * Usage:
 * ```html
 * <StyleProvider nonce="abc123">
 *   <App />
 * </StyleProvider>
 * ```
 */
export const StyleProvider = defineComponent({
  name: 'StyleProvider',
  props: {
    nonce: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    provide(ELEMIA_NONCE_KEY, props.nonce ?? null);
    return () => h('div', { style: 'display: contents' }, slots.default?.());
  },
});
