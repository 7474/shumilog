import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { SessionService } from '../services/SessionService.js';
import { UserService } from '../services/UserService.js';

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

export default users;