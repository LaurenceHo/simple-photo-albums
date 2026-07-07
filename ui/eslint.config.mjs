import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVitest from '@vitest/eslint-plugin';
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting';

export default defineConfigWithVueTs(
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
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
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/attributes-order': 'warn',
    },
  },
  {
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'server', '*.config.*', '*.d.ts'],
  },
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },
  {
    // `@vitest/eslint-plugin` 1.6.21 (latest) added chai-chain support that registers
    // `any` as a chai flag property, causing `valid-expect` to misclassify the standard
    // `expect.any(...)` asymmetric matcher as an "unknown modifier". Until upstream fixes
    // this false positive, disable the rule for test files. See classifyExpectChain in the
    // plugin: `any` lives in chaiFlagChainProperties.
    files: ['src/**/__tests__/*'],
    rules: {
      'vitest/valid-expect': 'off',
    },
  },
  prettierSkipFormatting,
);
