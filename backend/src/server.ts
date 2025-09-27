#!/usr/bin/env node

import { serve } from '@hono/node-server';
import { Miniflare } from 'miniflare';

import { createApp, initializeDatabase, type RuntimeEnv } from './index.js';
import { Database } from './db/database.js';

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);
const HOST = process.env.API_HOST ?? '0.0.0.0';

async function createBindings() {
  const mf = new Miniflare({
    modules: true,
    script: `export default { async fetch() { return new Response('dev-shim', { status: 404 }); } };`,
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
  });

  const d1 = await mf.getD1Database('DB');

  return { mf, d1 };
}

async function startServer() {
  try {
    console.log('🚀 Starting Shumilog Worker dev shim...');

    const nodeEnv = process.env.NODE_ENV ?? 'development';
    process.env.NODE_ENV = nodeEnv;

    const { mf, d1 } = await createBindings();

    const database = new Database({
      d1Database: d1,
      options: {
        enableForeignKeys: true,
      },
    });

    await initializeDatabase(database);

    const appEnv: RuntimeEnv = {
      NODE_ENV: nodeEnv,
      DB: d1,
      database,
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
      TWITTER_REDIRECT_URI:
        process.env.TWITTER_REDIRECT_URI ?? `http://localhost:${PORT}/api/auth/callback`,
      APP_BASE_URL: process.env.APP_BASE_URL ?? 'http://localhost:5173',
      APP_LOGIN_URL: process.env.APP_LOGIN_URL,
    };

    const app = createApp(appEnv);

    serve({
      fetch: app.fetch,
      port: PORT,
      hostname: HOST,
    });

    console.log(`✅ Worker shim running on http://${HOST}:${PORT}`);
    console.log('ℹ️  For full fidelity, prefer `npm run dev:worker` to mirror Cloudflare Workers.');

    const shutdown = async () => {
      console.log('\n🛑 Shutting down...');
      await mf.dispose();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();