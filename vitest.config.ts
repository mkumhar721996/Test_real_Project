import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environmentMatchGlobs: [
      ['src/client/**/*.test.tsx', 'jsdom'],
      ['src/server/**/*.test.ts', 'node'],
    ],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
