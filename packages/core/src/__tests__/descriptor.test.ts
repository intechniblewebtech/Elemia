import { describe, expect, it } from 'vitest';
import { block } from '../block';
import { getScopedName } from '../index';
import { hashScope } from '../scope';

describe('BlockDescriptor and getScopedName (CORE-08)', () => {
  it('author descriptor includes name, mode, scopedName, elements, modifiers', () => {
    const b = block('card', {
      __filePath: 'src/Card.ts',
      elements: ['header', 'body'] as const,
      modifiers: { compact: true, size: ['sm', 'md'] as const },
    });

    expect(b.descriptor.name).toBe('card');
    expect(b.descriptor.mode).toBe('author');
    expect(b.descriptor.scopedName).toBe(hashScope('card', 'src/Card.ts'));
    expect(b.descriptor.elements).toEqual(['header', 'body']);
    expect(b.descriptor.modifiers).toEqual({ compact: true, size: ['sm', 'md'] });
  });

  it('wrapper descriptor has scopedName null', () => {
    const styles = {
      card: 'card_hash',
      card__header: 'card__header_hash',
    };

    const b = block(styles, {
      elements: ['header'] as const,
      modifiers: { compact: true },
    });

    expect(b.descriptor.name).toBe('card');
    expect(b.descriptor.mode).toBe('wrapper');
    expect(b.descriptor.scopedName).toBeNull();
    expect(b.descriptor.elements).toEqual(['header']);
    expect(b.descriptor.modifiers).toEqual({ compact: true });
  });

  it('getScopedName returns author scoped name and wrapper null', () => {
    const author = block('card', { __filePath: 'src/Card.ts' });
    const wrapper = block({ card: 'card_hash' }, {});

    expect(getScopedName(author.descriptor)).toBe(hashScope('card', 'src/Card.ts'));
    expect(getScopedName(wrapper.descriptor)).toBeNull();
  });
});
