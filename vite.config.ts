import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number(process.env.ARC_DEV_PORT) || 8017;
const webPort = Number(process.env.ARC_WEB_PORT) || 3017;

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    proxy: {
      '/api': `http://localhost:${devPort}`,
    },
  },
});
