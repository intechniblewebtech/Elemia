import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name) => `https://elemia.dev/rules/${name}`);

type MessageIds = 'avoidTemplateClassnames' | 'migrateToBlock';

type Options = [];

function hasTemplateExpression(node: TSESTree.Expression): node is TSESTree.TemplateLiteral {
  return node.type === 'TemplateLiteral' && node.expressions.length > 0;
}

export default createRule<Options, MessageIds>({
  name: 'no-template-classnames',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow template literal class name construction during Elemia migration',
    },
    schema: [],
    messages: {
      avoidTemplateClassnames: 'Avoid template literal class names. Prefer block() usage for class composition.',
      migrateToBlock: 'TODO: migrate this class construction to block() usage.',
    },
    hasSuggestions: true,
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node): void {
      context.report({
        node,
        messageId: 'avoidTemplateClassnames',
        suggest: [
          {
            messageId: 'migrateToBlock',
            fix(fixer) {
              return fixer.insertTextBefore(node, '/* TODO: migrate to block() */ ');
            },
          },
        ],
      });
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className' || !node.value || node.value.type !== 'JSXExpressionContainer') {
          return;
        }

        const expr = node.value.expression;
        if (expr.type !== 'JSXEmptyExpression' && hasTemplateExpression(expr)) {
          report(expr);
        }
      },
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') {
          return;
        }

        if (node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'add') {
          return;
        }

        for (const argument of node.arguments) {
          if (argument.type === 'TemplateLiteral' && argument.expressions.length > 0) {
            report(argument);
          }
        }
      },
    };
  },
});
