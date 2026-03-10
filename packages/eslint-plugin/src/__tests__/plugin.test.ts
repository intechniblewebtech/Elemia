import { describe, expect, it } from 'vitest';

import plugin, { rules } from '../index';

describe('eslint plugin export shape', () => {
  it('exports both rule keys from named rules map', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'consistent-block-usage',
      'no-template-classnames',
    ]);
  });

  it('default export includes metadata and rules map', () => {
    expect(plugin.meta?.name).toBe('@elemia/eslint-plugin');
    expect(plugin.rules).toBeDefined();
    expect(plugin.rules['no-template-classnames']).toBeDefined();
    expect(plugin.rules['consistent-block-usage']).toBeDefined();
  });
});
