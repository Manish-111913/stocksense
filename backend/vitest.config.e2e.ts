import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Creates / drops the throwaway `stocksense_test` database (needs the Docker DB running)
    globalSetup: ['./test/global-setup.ts'],
    testTimeout: 30_000,
  },
});
