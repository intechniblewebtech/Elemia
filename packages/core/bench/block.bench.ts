import { bench, describe } from 'vitest';
import { block } from '../src';

const wrapperStyles = {
  card: 'card_hash',
  card__title: 'card_title_hash',
  card__body: 'card_body_hash',
  'card--active': 'card_active_hash',
  'card--size-sm': 'card_size_sm_hash',
  'card--size-md': 'card_size_md_hash',
  'card--size-lg': 'card_size_lg_hash',
} as const;

const wrapperBlock = block(wrapperStyles, {
  elements: ['title', 'body'] as const,
  modifiers: {
    active: true,
    size: ['sm', 'md', 'lg'] as const,
  },
  naming: 'bem',
});

const authorBlock = block('Card', {
  elements: ['title', 'body'] as const,
  modifiers: {
    active: true,
    size: ['sm', 'md', 'lg'] as const,
  },
});

describe('core block runtime micro-benchmarks', () => {
  bench('wrapper b() root without modifiers', () => {
    wrapperBlock(null);
  });

  bench('author b() root without modifiers', () => {
    authorBlock(null);
  });

  bench('wrapper b() root with 3 modifiers', () => {
    wrapperBlock(null, {
      active: true,
      size: 'lg',
    });
  });

  bench('author b() root with 3 modifiers', () => {
    authorBlock(null, {
      active: true,
      size: 'lg',
    });
  });

  bench('wrapper b(element, modifiers)', () => {
    wrapperBlock('title', {
      size: 'md',
    });
  });

  bench('author b(element, modifiers)', () => {
    authorBlock('title', {
      size: 'md',
    });
  });

  bench('block() factory creation overhead', () => {
    block('CardBench', {
      elements: ['title', 'body', 'footer'] as const,
      modifiers: {
        active: true,
        size: ['sm', 'md', 'lg'] as const,
        tone: ['neutral', 'brand', 'danger'] as const,
      },
    });
  });
});
