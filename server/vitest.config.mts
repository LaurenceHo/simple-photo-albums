import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/slowbuffer-polyfill.cjs'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      exclude: ['**/**.js', '**/**.d.ts', '*.config.*', '**/**/test/**', 'src/mocks/**', 'src/types/**', 'src/**/index.ts'],
    },
  },
});
