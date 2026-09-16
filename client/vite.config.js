import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.ARC_WEB_PORT) || 3018,
    proxy: {
      '/api': `http://localhost:${process.env.ARC_DEV_PORT || 8018}`,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
  },
});
