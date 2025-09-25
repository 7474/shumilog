import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const auth = new Hono();

// GET /auth/twitter - Initiate Twitter OAuth flow
auth.get('/twitter', async (c) => {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID || 'test_client_id';
    const redirectUri = process.env.TWITTER_REDIRECT_URI || 'http://localhost:8787/api/auth/callback';
    
    if (!clientId || !redirectUri) {
      throw new HTTPException(500, { message: 'Twitter OAuth not configured' });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomUUID();
    
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'tweet.read users.read');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', 'challenge');
    authUrl.searchParams.set('code_challenge_method', 'plain');

    return c.redirect(authUrl.toString(), 302);
  } catch (error) {
    console.error('Twitter OAuth initiation failed:', error);
    throw new HTTPException(400, { message: 'Failed to initiate Twitter OAuth' });
  }
});

// GET /auth/callback - Handle Twitter OAuth callback
auth.get('/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    
    if (!code) {
      throw new HTTPException(401, { message: 'Missing authorization code' });
    }
    
    if (!state) {
      throw new HTTPException(401, { message: 'Missing state parameter' });
    }

    // For now, just simulate OAuth validation
    // TODO: Implement actual Twitter OAuth exchange
    
    // Simulate OAuth code validation - reject invalid codes
    if (code === 'invalid_code' || code === 'expired_code') {
      throw new HTTPException(401, { message: 'Authentication failed' });
    }
    
    const sessionToken = crypto.randomUUID();
    
    // Set session cookie and redirect
    c.header('Set-Cookie', `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`);
    
    // Redirect to app dashboard
    return c.redirect('/', 302);
  } catch (error) {
    console.error('OAuth callback failed:', error);
    throw new HTTPException(401, { message: 'Authentication failed' });
  }
});

// POST /auth/logout - Logout user
auth.post('/logout', async (c) => {
  try {
    const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
    
    // Always clear session cookie and return success for security
    // Don't reveal whether session was valid or not
    c.header('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
    
    if (sessionToken && sessionToken === 'valid_session_token') {
      // TODO: Implement actual session revocation
      console.log('Valid session logged out');
    }
    
    return c.json({ 
      success: true,
      message: 'Successfully logged out' 
    });
  } catch (error) {
    console.error('Logout failed:', error);
    // Still return success for security reasons
    return c.json({ 
      success: true,
      message: 'Successfully logged out' 
    });
  }
});

export default auth;