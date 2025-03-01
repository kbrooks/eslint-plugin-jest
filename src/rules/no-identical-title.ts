import {
  createRule,
  getStringValue,
  isStringNode,
  isSupportedAccessor,
  isTypeOfJestFnCall,
  parseJestFnCall,
} from './utils';

interface DescribeContext {
  describeTitles: Set<string>;
  testTitles: Set<string>;
}

const newDescribeContext = (): DescribeContext => ({
  describeTitles: new Set(),
  testTitles: new Set(),
});

export default createRule({
  name: __filename,
  meta: {
    docs: {
      category: 'Best Practices',
      description: 'Disallow identical titles',
      recommended: 'error',
    },
    messages: {
      multipleTestTitle:
        'Test title is used multiple times in the same describe block.',
      multipleDescribeTitle:
        'Describe block title is used multiple times in the same describe block.',
    },
    schema: [],
    type: 'suggestion',
  },
  defaultOptions: [],
  create(context) {
    const contexts = [newDescribeContext()];

    return {
      CallExpression(node) {
        const currentLayer = contexts[contexts.length - 1];

        const jestFnCall = parseJestFnCall(node, context);

        if (!jestFnCall) {
          return;
        }

        if (jestFnCall.type === 'describe') {
          contexts.push(newDescribeContext());
        }

        if (jestFnCall.members.find(s => isSupportedAccessor(s, 'each'))) {
          return;
        }

        const [argument] = node.arguments;

        if (!argument || !isStringNode(argument)) {
          return;
        }

        const title = getStringValue(argument);

        if (jestFnCall.type === 'test') {
          if (currentLayer.testTitles.has(title)) {
            context.report({
              messageId: 'multipleTestTitle',
              node: argument,
            });
          } else {
            currentLayer.testTitles.add(title);
          }
        }

        if (jestFnCall.type !== 'describe') {
          return;
        }
        if (currentLayer.describeTitles.has(title)) {
          context.report({
            messageId: 'multipleDescribeTitle',
            node: argument,
          });
        } else {
          currentLayer.describeTitles.add(title);
        }
      },
      'CallExpression:exit'(node) {
        if (isTypeOfJestFnCall(node, context, ['describe'])) {
          contexts.pop();
        }
      },
    };
  },
});
