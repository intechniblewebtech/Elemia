import { describe, expect, it } from 'vitest';
import { djb2a, hashScope, noneScope, prefixScope } from '../scope';

describe('scope helpers (CORE-06)', () => {
  it('djb2a returns a stable 6-char base-36 hash', () => {
    const value = djb2a('card');
    expect(value).toMatch(/^[0-9a-z]{6}$/);
    expect(djb2a('card')).toBe(value);
  });

  it("hashScope('card') matches expected format", () => {
    const scoped = hashScope('card');
    expect(scoped).toMatch(/^card_[0-9a-z]{6}$/);
  });

  it('hashScope with filePath changes hash input', () => {
    const withoutPath = hashScope('card');
    const withPath = hashScope('card', 'src/Card.ts');
    expect(withPath).not.toBe(withoutPath);
  });

  it('hashScope with salt changes hash input', () => {
    const withoutSalt = hashScope('card', 'src/Card.ts');
    const withSalt = hashScope('card', 'src/Card.ts', 'my-project');
    expect(withSalt).not.toBe(withoutSalt);
  });

  it('hashScope is deterministic for all input variants', () => {
    expect(hashScope('card')).toBe(hashScope('card'));
    expect(hashScope('card', 'src/Card.ts')).toBe(hashScope('card', 'src/Card.ts'));
    expect(hashScope('card', 'src/Card.ts', 'my-project')).toBe(
      hashScope('card', 'src/Card.ts', 'my-project'),
    );
  });

  it('hashScope normalizes Windows path separators', () => {
    expect(hashScope('card', 'src\\Card.ts')).toBe(hashScope('card', 'src/Card.ts'));
  });

  it("prefixScope('ns')('card') returns prefixed block", () => {
    expect(prefixScope('ns')('card')).toBe('ns-card');
  });

  it("noneScope('card') returns the block unchanged", () => {
    expect(noneScope('card')).toBe('card');
  });
});
