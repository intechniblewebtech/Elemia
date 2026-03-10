import { afterAll, beforeAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';

// Wire Vitest's lifecycle hooks into RuleTester. All assignments are
// type-compatible except beforeAll, whose Vitest signature is wider than
// what RuleTester declares (extra optional options parameter).
RuleTester.afterAll = afterAll;
// @ts-expect-error — Vitest beforeAll signature is wider than RuleTester.beforeAll
RuleTester.beforeAll = beforeAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export { RuleTester, parser };
