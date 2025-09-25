import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      // Miniflare options for Cloudflare Workers testing
      modules: true,
      scriptPath: './src/index.ts',
      bindings: {
        // Environment variables for testing
        ENVIRONMENT: 'test',
        TWITTER_CLIENT_ID: 'test_client_id',
        TWITTER_CLIENT_SECRET: 'test_client_secret',
        TWITTER_REDIRECT_URI: 'http://localhost:8787/api/auth/callback',
        SESSION_SECRET: 'test_session_secret',
      },
      d1Databases: {
        DB: 'test-db',
      },
      kvNamespaces: {
        SESSIONS: 'test-sessions',
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});