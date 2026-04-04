import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVitest from '@vitest/eslint-plugin';
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting';

export default defineConfigWithVueTs(
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
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
  prettierSkipFormatting,
);
