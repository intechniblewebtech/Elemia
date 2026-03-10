import { describe, it, expect } from 'vitest';
import { block } from '../block';
import { hashScope } from '../scope';

const AUTHOR_FILE_PATH = 'src/Card.ts';
const CARD_ROOT = hashScope('card', AUTHOR_FILE_PATH);

// ---------------------------------------------------------------------------
// Fixture styles object for wrapper mode tests
// ---------------------------------------------------------------------------
const cardStyles: Record<string, string> = {
  card: 'card_abc123',
  'card__header': 'card__header_xyz789',
  'card__body': 'card__body_def456',
  'card__header--active': 'card__header--active_qrs012',
};

// ---------------------------------------------------------------------------
// Author mode — array schema
// ---------------------------------------------------------------------------
describe('block() — elements (author mode, array schema)', () => {
  it('b(element) returns BEM element class', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH, elements: ['header', 'body', 'footer'] as const });
    expect(b('header')).toBe(`${CARD_ROOT}__header`);
  });

  it('b(element) returns BEM class for each defined element', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH, elements: ['header', 'body', 'footer'] as const });
    expect(b('body')).toBe(`${CARD_ROOT}__body`);
    expect(b('footer')).toBe(`${CARD_ROOT}__footer`);
  });

  it('b(element, modifiers) appends modifier classes to element class', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH, elements: ['header'] as const });
    expect(b('header', { active: true })).toBe(`${CARD_ROOT}__header ${CARD_ROOT}__header--active`);
  });

  it('b(null) still returns block root class with element schema present', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH, elements: ['header', 'body'] as const });
    expect(b(null)).toBe(CARD_ROOT);
  });

  it('b(null, modifiers) still works alongside element schema', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH, elements: ['header'] as const, modifiers: { compact: true } });
    expect(b(null, { compact: true })).toBe(`${CARD_ROOT} ${CARD_ROOT}--compact`);
  });

  it('b.descriptor.elements lists all element names from array schema', () => {
    const b = block('card', { __filePath: AUTHOR_FILE_PATH, elements: ['header', 'body', 'footer'] as const });
    expect(b.descriptor.elements).toEqual(['header', 'body', 'footer']);
  });
});

// ---------------------------------------------------------------------------
// Author mode — record schema
// ---------------------------------------------------------------------------
describe('block() — elements (author mode, record schema)', () => {
  it('b(element) returns BEM element class', () => {
    const b = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      elements: {
        header: {},
        body: {},
      },
    });
    expect(b('header')).toBe(`${CARD_ROOT}__header`);
    expect(b('body')).toBe(`${CARD_ROOT}__body`);
  });

  it('b.descriptor.elements lists element names from record schema', () => {
    const b = block('card', {
      __filePath: AUTHOR_FILE_PATH,
      elements: {
        header: {},
        body: {},
      },
    });
    expect(b.descriptor.elements).toEqual(['header', 'body']);
  });
});

// ---------------------------------------------------------------------------
// Wrapper mode — element resolution from CSS Module
// ---------------------------------------------------------------------------
describe('block() — elements (wrapper mode, CSS Module resolution)', () => {
  it('b(element) returns the CSS Module hashed value when key exists in styles', () => {
    const b = block(cardStyles, { elements: ['header', 'body'] as const });
    // Should return the CSS Module value, not the raw BEM key
    expect(b('header')).toBe('card__header_xyz789');
  });

  it('b(element) returns the CSS Module hashed value for each element', () => {
    const b = block(cardStyles, { elements: ['header', 'body'] as const });
    expect(b('body')).toBe('card__body_def456');
  });

  it('b(element) falls back to raw BEM key when element not in styles', () => {
    const b = block(cardStyles, { elements: ['footer'] as const });
    // 'card__footer' is not in cardStyles, so fallback to raw BEM key
    expect(b('footer')).toBe('card__footer');
  });

  it('b(element, modifiers) includes modifier class using styles lookup or BEM fallback', () => {
    const b = block(cardStyles, { elements: ['header'] as const });
    // 'card__header--active' exists in cardStyles
    expect(b('header', { active: true })).toBe('card__header_xyz789 card__header--active_qrs012');
  });
});
