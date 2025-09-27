import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_DEV_API_PROXY ?? 'http://localhost:8787';

  return {
    plugins: [react(), tsconfigPaths()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
    test: {
      root: '.',
      include: ['tests/**/*.spec.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      globals: true,
      css: true,
    },
  };
});