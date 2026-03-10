import { describe, expect, it } from 'vitest';
import { block } from '../block';
import {
  autoResolver,
  bemResolver,
  camelResolver,
  dashesResolver,
  resetResolverCache,
} from '../resolvers';

describe('resolvers (CORE-09)', () => {
  it('camelResolver maps element + boolean modifier to camel key', () => {
    const styles = {
      title: 'title_hash',
      titleActive: 'titleActive_hash',
    };

    expect(camelResolver(styles, 'title')).toBe('title_hash');
    expect(camelResolver(styles, 'title', { active: true })).toBe('titleActive_hash');
  });

  it('dashesResolver maps element + boolean modifier to dashes key', () => {
    const styles = {
      title: 'title_hash',
      'title--active': 'titleActive_hash',
    };

    expect(dashesResolver(styles, 'title')).toBe('title_hash');
    expect(dashesResolver(styles, 'title', { active: true })).toBe('titleActive_hash');
  });

  it('bemResolver maps element to block__element key', () => {
    const styles = {
      card: 'card_hash',
      'card__header': 'header_hash',
    };

    expect(bemResolver(styles, 'card', 'header')).toBe('header_hash');
  });

  it('autoResolver detects camel convention', () => {
    resetResolverCache();
    const styles = {
      card: 'card_hash',
      title: 'title_hash',
      titleActive: 'titleActive_hash',
    };

    expect(autoResolver(styles, 'card', 'title', { active: true })).toBe('titleActive_hash');
  });

  it('autoResolver detects dashes convention', () => {
    resetResolverCache();
    const styles = {
      card: 'card_hash',
      title: 'title_hash',
      'title--active': 'titleActive_hash',
    };

    expect(autoResolver(styles, 'card', 'title', { active: true })).toBe('titleActive_hash');
  });

  it('autoResolver reuses cached convention for same styles object', () => {
    resetResolverCache();
    const styles: Record<string, string> = {
      card: 'card_hash',
      title: 'title_hash',
      'title--active': 'titleActive_hash',
    };

    expect(autoResolver(styles, 'card', 'title', { active: true })).toBe('titleActive_hash');

    styles['titleActive'] = 'wrong_camel_should_not_be_used';

    expect(autoResolver(styles, 'card', 'title', { active: true })).toBe('titleActive_hash');
  });

  it('autoResolver miss throws attempted keys and available keys with naming suggestion', () => {
    resetResolverCache();
    const styles = {
      card: 'card_hash',
      somethingElse: 'x',
    };

    expect(() => autoResolver(styles, 'card', 'title', { active: true })).toThrowError(
      /Resolver miss for element 'title' in block 'card'[\s\S]*Tried: camel \('cardTitleActive'\), dashes \('card-title--active'\), bem \('card__title--active'\)[\s\S]*Available keys: \[card, somethingElse\][\s\S]*set naming: 'dashes'/,
    );
  });
});

describe('block() wrapper naming integration (CORE-09)', () => {
  it('uses naming: camel for wrapper element resolution', () => {
    const styles = {
      card: 'card_hash',
      cardTitle: 'cardTitle_hash',
    };
    const b = block(styles, { naming: 'camel', elements: ['title'] as const });

    expect(b('title')).toBe('cardTitle_hash');
  });

  it('uses naming: dashes for wrapper element resolution', () => {
    const styles = {
      card: 'card_hash',
      'card-title': 'card-title_hash',
    };
    const b = block(styles, { naming: 'dashes', elements: ['title'] as const });

    expect(b('title')).toBe('card-title_hash');
  });

  it('uses naming: bem for wrapper element resolution', () => {
    const styles = {
      card: 'card_hash',
      'card__title': 'title_hash',
    };
    const b = block(styles, { naming: 'bem', elements: ['title'] as const });

    expect(b('title')).toBe('title_hash');
  });

  it('infers block root even when root key is not first in the styles object', () => {
    const styles = {
      'card__title': 'title_hash',
      'card--compact': 'compact_hash',
      card: 'card_hash',
    };
    const b = block(styles, { elements: ['title'] as const });
    expect(b(null)).toBe('card_hash');  // root should be 'card', not 'card__title'
    expect(b('title')).toBeDefined();   // element resolution should not throw
  });

  it('uses explicit rootKey when provided', () => {
    const styles = {
      'card__title': 'title_hash',
      card: 'card_hash',
    };
    const b = block(styles, { rootKey: 'card', elements: ['title'] as const });
    expect(b(null)).toBe('card_hash');
  });

  it('camel naming falls back to bare element key when prefixed key absent', () => {
    const styles = {
      card: 'card_hash',
      title: 'title_hash',  // bare key, no 'cardTitle'
    };
    const b = block(styles, { naming: 'camel', elements: ['title'] as const });
    expect(b('title')).toBe('title_hash');
  });

  it('falls back deterministically to the first key when all keys contain element or modifier separators', () => {
    // Degenerate case: no plain root key exists. inferRootKey falls back to
    // keys[0] ('--compact') — this is documented fallback behaviour, not a
    // silent error. The root call returns the hashed value of that key.
    const styles = {
      '--compact': 'compact_hash',
      '__title': 'title_hash',
    };
    const b = block(styles, { elements: [] as const });
    expect(b(null)).toBe('compact_hash');
  });
});
