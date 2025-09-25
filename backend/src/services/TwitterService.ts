export interface TwitterOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface TwitterUserProfile {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  email?: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
}

export interface TwitterOAuthState {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

export class TwitterService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly oauthStates: Map<string, TwitterOAuthState> = new Map();

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthUrl(redirectUri: string): Promise<{ authUrl: string; state: string }> {
    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store state for verification
    this.oauthStates.set(state, {
      state,
      codeVerifier,
      createdAt: Date.now()
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read users.read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return { authUrl, state };
  }

  /**
   * Verify state parameter to prevent CSRF attacks
   */
  verifyState(state: string): boolean {
    const storedState = this.oauthStates.get(state);
    if (!storedState) {
      return false;
    }

    // Check if state is not expired (10 minutes)
    const isExpired = Date.now() - storedState.createdAt > 10 * 60 * 1000;
    if (isExpired) {
      this.oauthStates.delete(state);
      return false;
    }

    return true;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string, state: string): Promise<TwitterOAuthTokens> {
    const storedState = this.oauthStates.get(state);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }

    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: storedState.codeVerifier
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter OAuth token exchange failed: ${error}`);
    }

    const data = await response.json() as any;

    // Clean up state
    this.oauthStates.delete(state);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };
  }

  /**
   * Get user profile from Twitter API
   */
  async getUserProfile(accessToken: string): Promise<TwitterUserProfile> {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified,public_metrics', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Twitter profile: ${error}`);
    }

    const data = await response.json() as any;
    const user = data.data;

    return {
      id: user.id,
      username: user.username,
      displayName: user.name,
      profileImageUrl: user.profile_image_url,
      verified: user.verified || false,
      followersCount: user.public_metrics?.followers_count || 0,
      followingCount: user.public_metrics?.following_count || 0
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TwitterOAuthTokens> {
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter token refresh failed: ${error}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Twitter might not return new refresh token
      expiresAt: Date.now() + (data.expires_in * 1000)
    };
  }

  /**
   * Generate random state parameter
   */
  private generateState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code challenge
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Clean up expired OAuth states
   */
  cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.oauthStates) {
      if (now - data.createdAt > 10 * 60 * 1000) { // 10 minutes
        this.oauthStates.delete(state);
      }
    }
  }
}