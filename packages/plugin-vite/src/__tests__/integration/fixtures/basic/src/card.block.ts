// @ts-nocheck — intentional fixture stub; Acorn parses this file pre-transpile
// so TypeScript syntax is intentionally absent.
export function block(name, options) {
  return { name, options };
}

export function styles(definition) {
  return definition;
}

export const cardBlock = block('card', {});
export const cardSheet = styles({
  color: 'red',
  backgroundColor: 'white',
});
