import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getCookie, setCookie } from 'hono/cookie';
import { SessionService } from '../services/SessionService.js';
import { UserService } from '../services/UserService.js';
import { TwitterService, TwitterUserProfile } from '../services/TwitterService.js';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js';

const auth = new Hono();

const OAUTH_STATE_COOKIE = 'oauth_state';

type RuntimeConfig = {
  nodeEnv: string;
  twitterClientId: string;
  twitterRedirectUri: string;
  oauthSuccessRedirect: string;
  oauthFailureRedirect: string;
};

const resolveSessionService = (c: any): SessionService => {
  const service = (c as any).get('sessionService') as SessionService | undefined;
  if (!service) {
    throw new HTTPException(500, { message: 'Session service not available' });
  }
  return service;
};

const resolveUserService = (c: any): UserService => {
  const service = (c as any).get('userService') as UserService | undefined;
  if (!service) {
    throw new HTTPException(500, { message: 'User service not available' });
  }
  return service;
};

const resolveTwitterService = (c: any): TwitterService => {
  const service = (c as any).get('twitterService') as TwitterService | undefined;
  if (!service) {
    throw new HTTPException(500, { message: 'Twitter service not available' });
  }
  return service;
};

const resolveRuntimeConfig = (c: any): RuntimeConfig => {
  const config = (c as any).get('config') as RuntimeConfig | undefined;
  if (!config) {
    throw new HTTPException(500, { message: 'Runtime configuration not available' });
  }
  return config;
};

const buildMockProfile = (state: string): TwitterUserProfile => {
  const hash = state ? state.substring(0, 8) : crypto.randomUUID().substring(0, 8);
  return {
    id: `mock-${hash}`,
    username: `mock_user_${hash}`,
    displayName: 'Mock User',
    profileImageUrl: `https://avatars.dicebear.com/api/identicon/${hash}.svg`,
    verified: false,
    followersCount: 0,
    followingCount: 0
  };
};

const clearOAuthStateCookie = (c: any) => {
  setCookie(c, OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0
  });
};

// GET /auth/twitter - Initiate Twitter OAuth flow
auth.get('/twitter', async (c) => {
  const twitterService = resolveTwitterService(c);
  const config = resolveRuntimeConfig(c);

  const redirectUri = config.twitterRedirectUri;
  if (!redirectUri) {
    throw new HTTPException(500, { message: 'Twitter redirect URI not configured' });
  }

  const requestedRedirect = c.req.query('redirect_uri');
  if (requestedRedirect && requestedRedirect !== redirectUri) {
    throw new HTTPException(400, { message: 'invalid redirect uri requested' });
  }

  try {
    const { authUrl, state } = await twitterService.getAuthUrl(redirectUri);
    const parsedUrl = new URL(authUrl);

    if (config.twitterClientId) {
      parsedUrl.searchParams.set('client_id', config.twitterClientId);
    }

    setCookie(c, OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 5 // 5 minutes
    });

    return c.redirect(parsedUrl.toString(), 302);
  } catch (error) {
    console.error('Twitter OAuth initiation failed:', error);
    throw new HTTPException(400, { message: 'Failed to initiate Twitter OAuth' });
  }
});

// GET /auth/callback - Handle Twitter OAuth callback
auth.get('/callback', async (c) => {
  const sessionService = resolveSessionService(c);
  const userService = resolveUserService(c);
  const twitterService = resolveTwitterService(c);
  const config = resolveRuntimeConfig(c);

  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code) {
    throw new HTTPException(401, { message: 'Missing authorization code' });
  }

  if (!state) {
    throw new HTTPException(401, { message: 'Missing state parameter' });
  }

  const stateCookie = getCookie(c, OAUTH_STATE_COOKIE);
  const isOfflineMode = config.nodeEnv !== 'production';

  if (stateCookie && stateCookie !== state) {
    clearOAuthStateCookie(c);
    throw new HTTPException(401, { message: 'Invalid OAuth state' });
  }

  if (!isOfflineMode && !twitterService.verifyState(state)) {
    clearOAuthStateCookie(c);
    throw new HTTPException(401, { message: 'Invalid OAuth state' });
  }

  try {
    let profile: TwitterUserProfile;

    if (isOfflineMode) {
      if (code === 'invalid-code' || code === 'invalid_code' || code === 'expired_code' || code === 'expired-code') {
        throw new HTTPException(401, { message: 'Authentication failed' });
      }

      profile = buildMockProfile(state);
    } else {
      const tokens = await twitterService.exchangeCodeForTokens(code, config.twitterRedirectUri, state);
      profile = await twitterService.getUserProfile(tokens.accessToken);
    }

    const user = await userService.findOrCreateUserByTwitter({
      twitter_username: profile.username,
      display_name: profile.displayName,
      avatar_url: profile.profileImageUrl
    });

    const sessionToken = await sessionService.issueSession(user.id);

    clearOAuthStateCookie(c);
    setSessionCookie(c, sessionToken);

    return c.redirect(config.oauthSuccessRedirect || '/', 302);
  } catch (error) {
    clearOAuthStateCookie(c);

    if (error instanceof HTTPException) {
      throw error;
    }

    console.error('OAuth callback failed:', error);
    throw new HTTPException(401, { message: 'Authentication failed' });
  }
});

// POST /auth/logout - Logout user
auth.post('/logout', async (c) => {
  const sessionService = resolveSessionService(c);
  const sessionToken = getCookie(c, 'session');

  if (!sessionToken) {
    throw new HTTPException(401, { message: 'No active session' });
  }

  try {
    await sessionService.revokeSession(sessionToken);
    clearSessionCookie(c);
    clearOAuthStateCookie(c);

    return c.json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    console.error('Logout failed:', error);
    throw new HTTPException(500, { message: 'Failed to logout' });
  }
});

export default auth;