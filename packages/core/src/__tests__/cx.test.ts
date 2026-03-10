import { describe, it, expect } from 'vitest';
import { cx } from '../cx';

describe('cx()', () => {
  it('returns empty string when called with no arguments', () => {
    expect(cx()).toBe('');
  });

  it('returns a single class string unchanged', () => {
    expect(cx('foo')).toBe('foo');
  });

  it('joins multiple class strings with a space', () => {
    expect(cx('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('filters out false values', () => {
    expect(cx('foo', false, 'bar')).toBe('foo bar');
  });

  it('filters out null values', () => {
    expect(cx('foo', null, 'bar')).toBe('foo bar');
  });

  it('filters out undefined values', () => {
    expect(cx('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('filters out empty strings', () => {
    expect(cx('foo', '', 'bar')).toBe('foo bar');
  });

  it('deduplicates repeated class names', () => {
    expect(cx('foo', 'bar', 'foo')).toBe('foo bar');
  });

  it('preserves order of first occurrence when deduplicating', () => {
    expect(cx('baz', 'foo', 'bar', 'foo', 'baz')).toBe('baz foo bar');
  });

  it('handles all-falsy input', () => {
    expect(cx(false, null, undefined)).toBe('');
  });
});
