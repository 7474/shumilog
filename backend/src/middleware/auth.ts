import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getCookie } from 'hono/cookie';
import { SessionService } from '../services/SessionService.js';
import { UserService } from '../services/UserService.js';
import { Database } from '../db/database.js';

export interface AuthContext {
  user: {
    id: string;
    twitter_username: string;
    display_name: string;
    avatar_url?: string;
    created_at: string;
  };
  sessionId: string;
}

/**
 * Authentication middleware for protected routes
 * Validates session and adds user info to context
 */
export const authMiddleware = (sessionService: SessionService, userService: UserService) => {
  return async (c: Context, next: Next) => {
    try {
      // Get session ID from cookie or Authorization header
      let sessionId: string | undefined;
      
      // Try cookie first (check both session_id and session for compatibility)
      const cookieSession = getCookie(c, 'session_id') || getCookie(c, 'session');
      if (cookieSession) {
        sessionId = cookieSession;
      } else {
        // Try Authorization header
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          sessionId = authHeader.substring(7);
        }
      }

      if (!sessionId) {
        throw new HTTPException(401, { message: 'No session provided' });
      }

      // Validate session
      const session = await sessionService.validateSession(sessionId);
      if (!session) {
        throw new HTTPException(401, { message: 'Invalid or expired session' });
      }

      // Get user info
      const user = await userService.findById(session.user_id);
      if (!user) {
        // User was deleted, clean up session
        await sessionService.revokeSession(session.token);
        throw new HTTPException(401, { message: 'User not found' });
      }

      // Add auth context to request
      c.set('auth', {
        user,
        sessionId: session.token
      } as AuthContext);

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      
      console.error('Auth middleware error:', error);
      throw new HTTPException(500, { message: 'Authentication error' });
    }
  };
};

/**
 * Optional auth middleware - doesn't throw if no session
 * but adds user info if valid session exists
 */
export const optionalAuthMiddleware = (sessionService: SessionService, userService: UserService) => {
  return async (c: Context, next: Next) => {
    try {
      // Get session ID from cookie or Authorization header
      let sessionId: string | undefined;
      
      const cookieSession = getCookie(c, 'session_id') || getCookie(c, 'session');
      if (cookieSession) {
        sessionId = cookieSession;
      } else {
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          sessionId = authHeader.substring(7);
        }
      }

      if (sessionId) {
        const session = await sessionService.validateSession(sessionId);
        if (session) {
          const user = await userService.findById(session.user_id);
          if (user) {
            c.set('auth', {
              user,
              sessionId: session.token
            } as AuthContext);
          }
        }
      }

      await next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      // Don't throw - optional auth should not break the request
      await next();
    }
  };
};

/**
 * Helper function to get authenticated user from context
 */
export const getAuthUser = (c: Context): AuthContext['user'] => {
  const auth = c.get('auth') as AuthContext;
  if (!auth) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }
  return auth.user;
};

/**
 * Helper function to get session ID from context
 */
export const getSessionId = (c: Context): string => {
  const auth = c.get('auth') as AuthContext;
  if (!auth) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }
  return auth.sessionId;
};

/**
 * Helper function to get optional authenticated user from context
 */
export const getOptionalAuthUser = (c: Context): AuthContext['user'] | null => {
  const auth = c.get('auth') as AuthContext;
  return auth?.user || null;
};