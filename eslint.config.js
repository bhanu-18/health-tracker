// ESLint flat config (the modern format -- the legacy .eslintrc is deprecated).
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', '.expo/**', 'coverage/**', 'ios/**', 'android/**'] },

  ...expoConfig,

  // Turns off every ESLint rule that only concerns formatting, so ESLint judges
  // correctness and Prettier owns layout. Without this, the two fight each other.
  prettierConfig,

  {
    files: ['**/*.ts', '**/*.tsx'],
    // In flat config a rule is only usable inside a config object that also
    // registers its plugin -- unlike the old .eslintrc, plugins are not global.
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // Unused variables are usually a leftover or a typo, but an underscore
      // prefix is the conventional way to say "intentionally ignored".
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
