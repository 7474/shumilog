#!/usr/bin/env node

/**
 * Docker development entry point
 * This script starts the application with proper database initialization for Docker environments
 */

import { serve } from '@hono/node-server';
import { createApp, initializeDatabase } from './index.js';
import { Database } from './db/database.js';

const PORT = Number(process.env.API_PORT) || 8787;
const HOST = '0.0.0.0';

async function startServer() {
  try {
    console.log('🚀 Starting Shumilog Backend for Docker development...');
    
    // Create environment object for Docker
    const env = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL || 'file:/data/shumilog.db',
      DB_PATH: process.env.DB_PATH || '/data/shumilog.db',
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
      // Add other environment variables as needed
    };

    console.log(`📊 Database path: ${env.DATABASE_URL}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    
    // Create the app
    const app = createApp(env);
    
    // Initialize database if in development mode
    if (env.NODE_ENV === 'development') {
      const database = new Database({
        databasePath: env.DATABASE_URL.replace('file:', ''),
        options: {
          enableForeignKeys: true
        }
      });
      
      await initializeDatabase(database);
    }

    // Start the server
    console.log(`🌐 Starting server on http://${HOST}:${PORT}`);
    
    serve({
      fetch: app.fetch.bind(app),
      port: PORT,
      hostname: HOST,
    });

    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();