// @ts-check
import globals from 'globals';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      'typescript-eslint': tsEslint.plugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tsEslint.parser,
        sourceType: 'module',
        project: ['tsconfig.json', 'tsconfig.dev.json'],
      },
    },
    rules: {
      quotes: [
        'warn',
        'single',
        {
          avoidEscape: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.js'],
    ...tsEslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.ts'],
  },
  {
    ignores: [
      '*.config.*',
      '*.d.ts',
      'assets',
      'coverage',
      'dist',
      'node_modules',
      'test',
      '.wrangler',
    ],
  },
);
