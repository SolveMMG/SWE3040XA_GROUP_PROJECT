module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Errors
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',

    // Style
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'comma-dangle': ['error', 'always-multiline'],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-infix-ops': 'error',
    'object-curly-spacing': ['error', 'always'],
    'arrow-spacing': ['error', { before: true, after: true }],
  },
};
