import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

// Import services
import { Database } from './db/database.js';
import { UserService } from './services/UserService.js';
import { TagService } from './services/TagService.js';
import { LogService } from './services/LogService.js';
import { SessionService } from './services/SessionService.js';
import { TwitterService } from './services/TwitterService.js';

// Import middleware
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { securityHeaders, requestLogger, rateLimiter } from './middleware/security.js';

// Import route handlers
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import tagRoutes from './routes/tags.js';
import logRoutes from './routes/logs.js';
import healthRoutes from './routes/health.js';
// import devRoutes from './routes/dev.js'; // Disabled for Cloudflare Workers compatibility

/**
 * Initialize database with migrations
 */
export async function initializeDatabase(database: Database): Promise<void> {
  try {
    console.log('Connecting to database...');
    await database.connect();
    
    // Check if migrations have been run
    const migrationCheck = await database.query('SELECT name FROM sqlite_master WHERE type="table" AND name="schema_migrations"');
    
    if (migrationCheck.length === 0) {
      console.log('Running database migrations...');
      await runDatabaseMigrations(database);
      console.log('Database migrations completed');
    } else {
      console.log('Database already migrated');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Run database migrations using TypeScript schemas
 */
async function runDatabaseMigrations(database: Database): Promise<void> {
  // Import migrations dynamically to avoid circular dependencies
  const { DATABASE_SCHEMAS } = await import('./db/schema.sql.js');
  const { SEED_TAGS } = await import('./db/seeds.sql.js');
  
  // Execute schema creation
  for (const schema of DATABASE_SCHEMAS) {
    await database.exec(schema);
  }
  
  // Insert seed data
  const existingTags = await database.query('SELECT COUNT(*) as count FROM tags');
  if (existingTags[0]?.count === 0) {
    console.log('Inserting seed data...');
    await insertSeedData(database, SEED_TAGS);
  }
}

/**
 * Insert seed data
 */
async function insertSeedData(database: Database, seedTags: any[]): Promise<void> {
  const insertTagStmt = database.prepare(`
    INSERT OR IGNORE INTO tags (id, name, description, category, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  
  for (const tag of seedTags) {
    const id = crypto.randomUUID();
    const metadata = tag.metadata ? JSON.stringify(tag.metadata) : null;
    const category = getCategoryFromTag(tag);
    
    await insertTagStmt.run([
      id,
      tag.name,
      tag.description || null,
      category,
      metadata,
      now,
      now
    ]);
  }
}

/**
 * Determine category from tag data
 */
function getCategoryFromTag(tag: any): string {
  if (['anime', 'manga', 'game', 'novel', 'movie'].includes(tag.name)) {
    return 'category';
  }
  
  if (['action', 'adventure', 'comedy', 'drama', 'fantasy', 'romance', 'sci-fi', 'slice-of-life'].includes(tag.name)) {
    return 'genre';
  }
  
  if (['completed', 'watching', 'reading', 'on-hold', 'dropped', 'plan-to-watch', 'plan-to-read'].includes(tag.name)) {
    return 'status';
  }
  
  if (tag.metadata?.japanese_name || tag.metadata?.mal_id) {
    return 'anime';
  }
  
  return 'other';
}

export function createApp(env: any) {
  // Initialize database with proper path for Docker environment
  const databasePath = env.DATABASE_URL || env.DB_PATH || ':memory:';
  const database = new Database({
    d1Database: env.DB, // Cloudflare D1 binding (for production)
    databasePath: env.NODE_ENV === 'test' ? ':memory:' : databasePath,
    options: {
      enableForeignKeys: true
    }
  });

  // Initialize services
  const sessionService = new SessionService(env.KV);
  const userService = new UserService(database);
  const tagService = new TagService(database);
  const logService = new LogService(database);
  const twitterService = new TwitterService(
    env.TWITTER_CLIENT_ID,
    env.TWITTER_CLIENT_SECRET
  );

  // Initialize Hono app
  const app = new Hono();

  // Global middleware
  app.use('*', securityHeaders());
  app.use('*', requestLogger());
  app.use('*', rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes
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

  // Add services to context for routes to access
  app.use('*', async (c, next) => {
    (c as any).set('database', database);
    (c as any).set('userService', userService);
    (c as any).set('tagService', tagService);
    (c as any).set('logService', logService);
    (c as any).set('sessionService', sessionService);
    (c as any).set('twitterService', twitterService);
    await next();
  });

  // Health check route (no auth required)
  app.route('/health', healthRoutes);

  // Development routes (no auth required, but restricted to development mode)
  // app.route('/dev', devRoutes); // Disabled for Cloudflare Workers compatibility

  // Auth routes (no auth required)
  app.route('/auth', authRoutes);

  // User routes - /users/me requires auth, but we'll handle that in the route
  app.route('/users', userRoutes);

  // Add auth middleware for protected tag operations
  app.use('/tags', async (c, next) => {
    // Only apply auth to POST, PUT, DELETE
    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
      await authMiddleware(sessionService, userService)(c, next);
    } else {
      await next();
    }
  });

  // Tag routes - public GET, but POST/PUT/DELETE require auth
  app.route('/tags', tagRoutes);

  // Add auth middleware for protected log operations
  app.use('/logs', async (c, next) => {
    // Only apply auth to POST, PUT, DELETE
    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
      await authMiddleware(sessionService, userService)(c, next);
    } else {
      await next();
    }
  });

  // Log routes - public GET for shared logs, but most operations require auth
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

  return app;
}

// Default export for Cloudflare Workers
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const app = createApp(env);
    return app.fetch(request, env, ctx);
  }
};