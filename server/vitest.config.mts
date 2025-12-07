import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    globals: true,
    include: [
      // Matches vitest tests in any subfolder of 'src' or into 'test/vitest', or subfolder of 'server'
      // Matches all files with extension 'ts' and 'tsx'
      'src/**/*.vitest.{test,spec}.{ts,tsx}',
      'test/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
