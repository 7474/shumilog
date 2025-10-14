import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { SessionService } from '../services/SessionService.js';
import { UserService } from '../services/UserService.js';
import { LogService } from '../services/LogService.js';
import { toLogResponse } from './logs.js';

const users = new Hono();

const resolveSessionService = (c: any): SessionService => {
  const sessionService = (c as any).get('sessionService') as SessionService | undefined;
  if (!sessionService) {
    throw new HTTPException(500, { message: 'Session service not available' });
  }
  return sessionService;
};

const resolveUserService = (c: any): UserService => {
  const userService = (c as any).get('userService') as UserService | undefined;
  if (!userService) {
    throw new HTTPException(500, { message: 'User service not available' });
  }
  return userService;
};

const resolveLogService = (c: any): LogService => {
  const logService = (c as any).get('logService') as LogService | undefined;
  if (!logService) {
    throw new HTTPException(500, { message: 'Log service not available' });
  }
  return logService;
};

// Require authentication for all /users routes
users.use('*', async (c, next) => {
  const sessionService = resolveSessionService(c);
  const userService = resolveUserService(c);
  return authMiddleware(sessionService, userService)(c, next);
});

// GET /users/me - Get current user profile
users.get('/me', async (c) => {
  const user = getAuthUser(c);
  return c.json(user);
});

// GET /users/me/logs - Get current user's logs (both public and private)
users.get('/me/logs', async (c) => {
  const user = getAuthUser(c);
  const logService = resolveLogService(c);

  // Parse pagination parameters
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

  // Get user's logs (both public and private)
  const result = await logService.getUserLogs(user.id, limit, offset);

  return c.json({
    items: result.logs.map(toLogResponse),
    total: result.total,
    limit,
    offset,
    has_more: result.hasMore
  });
});

// GET /users/me/stats - Get current user's statistics
users.get('/me/stats', async (c) => {
  const user = getAuthUser(c);
  const userService = resolveUserService(c);
  const logService = resolveLogService(c);

  // Get both log and tag statistics in parallel
  const [logStats, tagStats] = await Promise.all([
    logService.getUserLogStats(user.id),
    userService.getUserTagStats(user.id, 5)
  ]);

  return c.json({
    logs: {
      total: logStats.totalLogs,
      public: logStats.publicLogs,
      recent: logStats.recentLogsCount
    },
    tags: {
      total: tagStats.totalTags,
      top_tags: tagStats.topTags,
      recent_tags: tagStats.recentTags
    }
  });
});

export default users;