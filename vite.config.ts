import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: './src/setup.ts',
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      reporter: ['html', 'lcov', 'text'],
    },
    server: {
      deps: {
        inline: [/github-action-helper/]
      },
    },
  },
});
