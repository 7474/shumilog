import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';

import { Database } from './db/database.js';
import { UserService } from './services/UserService.js';
import { TagService } from './services/TagService.js';
import { LogService } from './services/LogService.js';
import { SessionService } from './services/SessionService.js';
import { TwitterService } from './services/TwitterService.js';
import { AiService, type AiBinding } from './services/AiService.js';
import { ImageService } from './services/ImageService.js';

import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { securityHeaders, requestLogger, rateLimiter } from './middleware/security.js';
import { cacheControl } from './middleware/cache.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import tagRoutes from './routes/tags.js';
import logRoutes from './routes/logs.js';
import imageRoutes from './routes/images.js';
import healthRoutes from './routes/health.js';
import devRoutes from './routes/dev.js';
import supportRoutes from './routes/support.js';

export interface RuntimeEnv {
  DB?: D1Database;
  SESSIONS?: KVNamespace;
  AI?: AiBinding;
  IMAGES?: R2Bucket;
  DATABASE_URL?: string;
  DB_PATH?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  TWITTER_CLIENT_ID?: string;
  TWITTER_CLIENT_SECRET?: string;
  TWITTER_REDIRECT_URI?: string;
  APP_BASE_URL?: string;
  APP_LOGIN_URL?: string;
  database?: Database;
}

interface RuntimeConfig {
  nodeEnv: string;
  twitterClientId: string;
  twitterClientSecret: string;
  twitterRedirectUri: string;
  appBaseUrl: string;
  appLoginUrl: string;
}

export type AppBindings = {
  Bindings: RuntimeEnv;
  Variables: {
    database: Database;
    sessionService: SessionService;
    userService: UserService;
    tagService: TagService;
    logService: LogService;
    twitterService: TwitterService;
    imageService: ImageService;
    aiService?: AiService;
    config: RuntimeConfig;
    auth?: {
      user: {
        id: string;
        twitter_username: string;
        display_name: string;
        avatar_url?: string;
        role: 'user' | 'admin';
        created_at: string;
      };
      sessionId: string;
    };
    hasPrivateData?: boolean;
  };
};

const MAX_RATE_REQUESTS = 100;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function resolveDatabase(env: RuntimeEnv, nodeEnv: string): Database {
  if (env.database) {
    return env.database;
  }

  const databasePath = env.DB
    ? undefined
    : env.DB_PATH
      ?? (env.DATABASE_URL ? env.DATABASE_URL.replace(/^file:/, '') : undefined)
      ?? (nodeEnv === 'test' ? ':memory:' : undefined)
      ?? ':memory:';

  return new Database({
    d1Database: env.DB,
    databasePath,
    options: {
      enableForeignKeys: true,
    },
  });
}

function registerApiRoutes(app: Hono<AppBindings>, sessionService: SessionService, userService: UserService) {
  const requireAuth = authMiddleware(sessionService, userService);
  const optionalAuth = optionalAuthMiddleware(sessionService, userService);

  app.route('/auth', authRoutes);
  app.route('/users', userRoutes);

  // Apply authentication middleware to tags routes  
  // Note: Hono's middleware matching:
  // - `/tags` matches exactly /tags
  // - `/tags/*` matches /tags/anything and /tags/anything/more (greedy wildcard)
  // We need to handle both POST /tags and PUT/DELETE /tags/:id and POST/DELETE /tags/:id/associations
  app.use('/tags', async (c, next) => {
    if (['POST'].includes(c.req.method)) {
      return requireAuth(c, next);
    }
    return next();
  });
  app.use('/tags/*', async (c, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
      return requireAuth(c, next);
    }
    return next();
  });
  app.route('/tags', tagRoutes);

  // Apply authentication middleware to logs routes
  // Similar pattern: handle both base path and all sub-paths
  app.use('/logs', async (c, next) => {
    if (c.req.method === 'POST') {
      return requireAuth(c, next);
    }
    return optionalAuth(c, next);
  });
  app.use('/logs/*', async (c, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
      return requireAuth(c, next);
    }
    return optionalAuth(c, next);
  });
  // Register image routes first (more specific paths should be registered before general ones)
  app.route('/logs', imageRoutes);
  app.route('/logs', logRoutes);

  // Support routes require authentication for all methods
  app.use('/support/*', requireAuth);
  app.route('/support', supportRoutes);
}

export function createApp(env: RuntimeEnv = {}) {
  const nodeEnv = env.NODE_ENV ?? env.ENVIRONMENT ?? 'development';
  process.env.NODE_ENV = nodeEnv;

  const database = resolveDatabase(env, nodeEnv);
  const sessionService = new SessionService(database);
  const userService = new UserService(database);
  const tagService = new TagService(database);
  const logService = new LogService(database);
  const imageService = new ImageService(database, env.IMAGES || null);

  // AiServiceを初期化（AIバインディングがある場合のみ）
  const aiService = env.AI ? new AiService(env.AI) : undefined;

  const appBaseUrl = env.APP_BASE_URL ?? process.env.APP_BASE_URL ?? 'http://localhost:5173';
  const runtimeConfig: RuntimeConfig = {
    nodeEnv,
    twitterClientId: env.TWITTER_CLIENT_ID ?? process.env.TWITTER_CLIENT_ID ?? '',
    twitterClientSecret: env.TWITTER_CLIENT_SECRET ?? process.env.TWITTER_CLIENT_SECRET ?? '',
    twitterRedirectUri:
      env.TWITTER_REDIRECT_URI
      ?? process.env.TWITTER_REDIRECT_URI
      ?? 'http://localhost:8787/api/auth/callback',
    appBaseUrl,
    appLoginUrl: env.APP_LOGIN_URL ?? process.env.APP_LOGIN_URL ?? `${appBaseUrl.replace(/\/?$/, '')}/login`,
  };

  const twitterService = new TwitterService(runtimeConfig.twitterClientId, runtimeConfig.twitterClientSecret);

  const app = new Hono<AppBindings>();

  const allowedOrigins = new Set(
    [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8787',
      runtimeConfig.appBaseUrl,
    ]
      .filter((value): value is string => Boolean(value))
      .map((origin) => origin.replace(/\/?$/, '')),
  );

  app.use('*', cors({
    origin: (origin) => {
      if (!origin) {
        return runtimeConfig.nodeEnv === 'development' ? '*' : null;
      }
      const normalised = origin.replace(/\/?$/, '');
      if (allowedOrigins.has(normalised)) {
        return origin;
      }
      return runtimeConfig.nodeEnv === 'development' ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
  }));

  app.use('*', securityHeaders());
  app.use('*', requestLogger());
  app.use('*', rateLimiter(RATE_WINDOW_MS, MAX_RATE_REQUESTS));
  app.use('*', cacheControl());

  app.use('*', async (c, next) => {
    c.set('database', database);
    c.set('sessionService', sessionService);
    c.set('userService', userService);
    c.set('tagService', tagService);
    c.set('logService', logService);
    c.set('twitterService', twitterService);
    c.set('imageService', imageService);
    if (aiService) {
      c.set('aiService', aiService);
    }
    c.set('config', runtimeConfig);
    await next();
  });

  app.route('/health', healthRoutes);
  app.route('/dev', devRoutes);

  registerApiRoutes(app.basePath('/api'), sessionService, userService);
  
  // Also register API routes at root level for backward compatibility with tests
  registerApiRoutes(app, sessionService, userService);

  app.onError((err, c) => {
    console.error('Unhandled error:', err);

    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }

    return c.json({ error: 'Internal server error' }, 500);
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  return app;
}

export type AppType = ReturnType<typeof createApp>;

let cachedApp: Hono<AppBindings> | null = null;

export default {
  async fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> {
    if (!cachedApp) {
      cachedApp = createApp(env);
    }

    return cachedApp.fetch(request, env, ctx);
  },
};