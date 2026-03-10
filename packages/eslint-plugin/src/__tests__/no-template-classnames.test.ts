import { RuleTester, parser } from './setup-rule-tester';
import rule from '../rules/no-template-classnames';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
});

ruleTester.run('no-template-classnames', rule, {
  valid: [
    {
      code: 'const el = <div className="static-string" />;',
    },
    {
      code: 'const el = <div className={styles.foo} />;',
    },
    {
      code: 'const el = <div className={block("card")} />;',
    },
    {
      code: 'const value = `static`; const el = <div className={value} />;',
    },
    {
      code: 'const el = <div {...props} className={cx(styles.card, extra)} />;',
    },
    {
      code: 'const el = <div className={condition ? styles.a : styles.b} />;',
    },
    {
      code: 'element.classList.add("foo", "bar");',
    },
    {
      code: 'element.classList.add(styleName);',
    },
    {
      code: 'const el = <div className={"foo " + bar} />;',
    },
    {
      code: 'const cls = String.raw`x`; const el = <div className={cls} />;',
    },
  ],
  invalid: [
    {
      code: 'const el = <div className={`bar ${baz}`} />;',
      errors: [
        {
          messageId: 'avoidTemplateClassnames',
          suggestions: [
            {
              messageId: 'migrateToBlock',
              output: 'const el = <div className={/* TODO: migrate to block() */ `bar ${baz}`} />;',
            },
          ],
        },
      ],
    },
    {
      code: 'const el = <div className={`foo ${bar}`} />;',
      errors: [
        {
          messageId: 'avoidTemplateClassnames',
          suggestions: [
            {
              messageId: 'migrateToBlock',
              output: 'const el = <div className={/* TODO: migrate to block() */ `foo ${bar}`} />;',
            },
          ],
        },
      ],
    },
    {
      code: 'element.classList.add(`foo ${bar}`);',
      errors: [
        {
          messageId: 'avoidTemplateClassnames',
          suggestions: [
            {
              messageId: 'migrateToBlock',
              output: 'element.classList.add(/* TODO: migrate to block() */ `foo ${bar}`);',
            },
          ],
        },
      ],
    },
    {
      code: 'const el = <div className={`foo-${bar}`} />;',
      errors: [{
        messageId: 'avoidTemplateClassnames',
        suggestions: [{
          messageId: 'migrateToBlock',
          output: 'const el = <div className={/* TODO: migrate to block() */ `foo-${bar}`} />;',
        }],
      }],
    },
    {
      code: 'const el = <button className={`btn ${kind}`} />;',
      errors: [{
        messageId: 'avoidTemplateClassnames',
        suggestions: [{
          messageId: 'migrateToBlock',
          output: 'const el = <button className={/* TODO: migrate to block() */ `btn ${kind}`} />;',
        }],
      }],
    },
    {
      code: 'node.classList.add(`a ${b}`, "safe");',
      errors: [{
        messageId: 'avoidTemplateClassnames',
        suggestions: [{
          messageId: 'migrateToBlock',
          output: 'node.classList.add(/* TODO: migrate to block() */ `a ${b}`, "safe");',
        }],
      }],
    },
    {
      code: 'node.classList.add("safe", `a ${b}`);',
      errors: [{
        messageId: 'avoidTemplateClassnames',
        suggestions: [{
          messageId: 'migrateToBlock',
          output: 'node.classList.add("safe", /* TODO: migrate to block() */ `a ${b}`);',
        }],
      }],
    },
    {
      code: 'const el = <div className={`${a}${b}`} />;',
      errors: [{
        messageId: 'avoidTemplateClassnames',
        suggestions: [{
          messageId: 'migrateToBlock',
          output: 'const el = <div className={/* TODO: migrate to block() */ `${a}${b}`} />;',
        }],
      }],
    },
    {
      code: 'const el = <div className={`${styles.a} ${styles.b}`} />;',
      errors: [{
        messageId: 'avoidTemplateClassnames',
        suggestions: [{
          messageId: 'migrateToBlock',
          output: 'const el = <div className={/* TODO: migrate to block() */ `${styles.a} ${styles.b}`} />;',
        }],
      }],
    },
    {
      code: 'const el = <div className={`prefix-${variant}-suffix`} />;',
      errors: [{
        messageId: 'avoidTemplateClassnames',
        suggestions: [{
          messageId: 'migrateToBlock',
          output: 'const el = <div className={/* TODO: migrate to block() */ `prefix-${variant}-suffix`} />;',
        }],
      }],
    },
  ],
});
