import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const users = new Hono();

// GET /users/me - Get current user profile
users.get('/me', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  // Simple session validation - only accept 'valid_session_token'
  if (sessionToken !== 'valid_session_token') {
    throw new HTTPException(401, { message: 'Invalid session' });
  }

  // TODO: Validate session and get actual user info
  // For now, return mock user
  const mockUser = {
    id: 'user_123',
    twitter_username: 'testuser',  
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2023-01-01T00:00:00Z'
  };

  return c.json(mockUser);
});export default users;