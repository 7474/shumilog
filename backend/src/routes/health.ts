import { Hono } from 'hono';
import { Database } from '../db/database.js';

const health = new Hono();

// GET /health - Service health check endpoint
health.get('/', async (c) => {
  const timestamp = new Date().toISOString();
  const database = ((c as any).get('database') as Database | undefined) ?? null;

  let databaseStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
  let backendStatus: 'running' | 'degraded' = 'running';
  let healthy = true;

  if (database && database.getDb()) {
    try {
      healthy = await database.healthCheck();
      databaseStatus = healthy ? 'connected' : 'disconnected';
      backendStatus = healthy ? 'running' : 'degraded';
    } catch (error) {
      console.warn('Database health check failed:', error);
      healthy = false;
      databaseStatus = 'disconnected';
      backendStatus = 'degraded';
    }
  }

  const payload = {
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp,
    services: {
      database: databaseStatus,
      backend: backendStatus,
    },
  };

  return c.json(payload, healthy ? 200 : 503);
});

export default health;