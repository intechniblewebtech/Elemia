import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name) => `https://elemia.dev/rules/${name}`);

type Options = [{ allowMixed?: boolean }?];
type MessageIds = 'mixedUsage';

interface UsageState {
  hasCssModuleImport: boolean;
  hasBlockCall: boolean;
  hasRawPropertyAccess: boolean;
}

function isCssModuleImport(node: TSESTree.ImportDeclaration): boolean {
  return /\.module\.css$/i.test(node.source.value);
}

function isStylesIdentifier(node: TSESTree.Identifier, cssImportNames: Set<string>): boolean {
  return cssImportNames.has(node.name);
}

export default createRule<Options, MessageIds>({
  name: 'consistent-block-usage',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require consistent Elemia block usage strategy per file',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowMixed: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mixedUsage:
        'Do not mix block(styles, ...) usage with raw CSS module property access (styles.foo) in the same file.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const state: UsageState = {
      hasCssModuleImport: false,
      hasBlockCall: false,
      hasRawPropertyAccess: false,
    };

    const cssImportNames = new Set<string>();

    if (options?.allowMixed) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        if (!isCssModuleImport(node)) {
          return;
        }

        state.hasCssModuleImport = true;

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier') {
            cssImportNames.add(specifier.local.name);
          }
          if (specifier.type === 'ImportSpecifier') {
            cssImportNames.add(specifier.local.name);
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'block') {
          return;
        }

        const firstArgument = node.arguments[0];
        if (firstArgument?.type === 'Identifier' && isStylesIdentifier(firstArgument, cssImportNames)) {
          state.hasBlockCall = true;
        }
      },
      MemberExpression(node) {
        if (node.object.type !== 'Identifier' || !isStylesIdentifier(node.object, cssImportNames)) {
          return;
        }

        if (node.property.type === 'Identifier') {
          state.hasRawPropertyAccess = true;
        }
      },
      'Program:exit'(node) {
        const isMixed =
          state.hasCssModuleImport &&
          state.hasBlockCall &&
          state.hasRawPropertyAccess;

        if (!isMixed) {
          return;
        }

        context.report({
          node,
          messageId: 'mixedUsage',
        });
      },
    };
  },
});
