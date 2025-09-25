import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

// Import route handlers
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tagRoutes from './routes/tags';
import logRoutes from './routes/logs';

// Initialize Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Allow requests from development and production domains
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8787',
      'https://shumilog.example.com'
    ];
    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// API routes
app.route('/auth', authRoutes);
app.route('/users', userRoutes);
app.route('/tags', tagRoutes);
app.route('/logs', logRoutes);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  
  if (err instanceof HTTPException) {
    return c.json(
      { error: err.message },
      err.status
    );
  }
  
  return c.json(
    { error: 'Internal server error' },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;