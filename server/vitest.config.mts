import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      exclude: ['**/**.js', '**/**.d.ts', '*.config.*', '**/**/test/**', 'src/mocks/**', 'src/types/**', 'src/**/index.ts'],
    },
  },
});
