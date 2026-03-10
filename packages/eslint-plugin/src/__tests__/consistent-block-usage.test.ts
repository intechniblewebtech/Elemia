import { RuleTester, parser } from './setup-rule-tester';
import rule from '../rules/consistent-block-usage';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('consistent-block-usage', rule, {
  valid: [
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst cls = b('title');",
    },
    {
      code: "import styles from './Card.module.css';\nconst cls = styles.title;",
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst cls = styles.title;",
      options: [{ allowMixed: true }],
    },
    {
      code: "import styles from './Card.module.css';\nconst card = styles.card;\nconst title = styles.title;",
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst cls = b(null, { compact: true });",
    },
    {
      code: "import styles from './Card.module.css';\nfunction read(){ return styles['card']; }",
    },
    {
      code: "import tokens from './tokens.css';\nconst cls = tokens.foo;",
    },
    {
      code: "import styles from './Card.module.css';\nconst local = foo(styles);",
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(otherStyles, schema);\nconst cls = styles.card;",
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst cls = styles.card;",
      options: [{ allowMixed: true }],
    },
    {
      code: "import styles from './Card.module.css';\nconst merged = cx(styles.card, styles.title);",
    },
  ],
  invalid: [
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst cls = styles.title;",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst cls = styles.card;\nconst x = b('title');",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nfunction x(){ return styles.header; }",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nif (x) { styles.card; }",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst key = styles.title + '';",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst both = [styles.card, b('title')];",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst nested = () => styles.title;",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nconst x = styles?.card;",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nclass A { m(){ return styles.card; } }",
      errors: [{ messageId: 'mixedUsage' }],
    },
    {
      code: "import styles from './Card.module.css';\nconst b = block(styles, schema);\nexport const cls = styles.card;",
      errors: [{ messageId: 'mixedUsage' }],
    },
  ],
});
