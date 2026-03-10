import noTemplateClassnames from './rules/no-template-classnames';
import consistentBlockUsage from './rules/consistent-block-usage';

export const rules = {
  'no-template-classnames': noTemplateClassnames,
  'consistent-block-usage': consistentBlockUsage,
};

const plugin = {
  meta: {
    name: '@elemia/eslint-plugin',
    version: '0.1.0',
  },
  rules,
};

export default plugin;
