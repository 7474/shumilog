import { Hono } from 'hono';
import { Database } from '../db/database.js';

const health = new Hono();

// GET /health - Service health check endpoint
health.get('/', async (c) => {
  const timestamp = new Date().toISOString();
  
  try {
    // Check database connectivity
    let databaseStatus = 'disconnected';
    try {
      const dbConfig = {
        d1Database: (c.env as any)?.DB,
        databasePath: process.env.DB_PATH || '/data/shumilog.db'
      };
      const db = new Database(dbConfig);
      // Try a simple query to test connection
      await db.query('SELECT 1');
      databaseStatus = 'connected';
    } catch (error) {
      console.warn('Database health check failed:', error);
      databaseStatus = 'disconnected';
    }

    const healthData = {
      status: 'healthy',
      timestamp,
      version: '1.0.0-dev-hotreload',
      services: {
        database: databaseStatus,
        backend: 'running'
      }
    };

    return c.json(healthData, 200);
  } catch (error) {
    console.error('Health check failed:', error);
    
    const healthData = {
      status: 'unhealthy',
      timestamp,
      error: 'Health check failed',
      services: {
        database: 'disconnected',
        backend: 'error'
      }
    };

    return c.json(healthData, 503);
  }
});

export default health;