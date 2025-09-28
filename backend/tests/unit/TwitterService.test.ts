import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TwitterService } from '../../src/services/TwitterService.js';

// Mock the fetch function
global.fetch = vi.fn();

describe('TwitterService', () => {
  let twitterService: TwitterService;
  const mockClientId = 'test-client-id';
  const mockClientSecret = 'test-client-secret';
  const mockRedirectUri = 'https://example.com/callback';

  beforeEach(() => {
    vi.clearAllMocks();
    twitterService = new TwitterService(mockClientId, mockClientSecret);
  });

  describe('getAuthUrl', () => {
    it('should generate a valid Twitter OAuth URL with state', async () => {
      const result = await twitterService.getAuthUrl(mockRedirectUri);

      expect(result).toHaveProperty('authUrl');
      expect(result).toHaveProperty('state');
      
      expect(result.authUrl).toContain('https://x.com/i/oauth2/authorize');
      expect(result.authUrl).toContain(`client_id=${mockClientId}`);
      expect(result.authUrl).toContain(`redirect_uri=${encodeURIComponent(mockRedirectUri)}`);
      expect(result.authUrl).toContain(`state=${result.state}`);
      expect(result.authUrl).toContain('response_type=code');
      expect(result.authUrl).toContain('scope=');
      
      expect(typeof result.state).toBe('string');
      expect(result.state.length).toBeGreaterThan(10);
    });

    it('should generate different states for different calls', async () => {
      const result1 = await twitterService.getAuthUrl(mockRedirectUri);
      const result2 = await twitterService.getAuthUrl(mockRedirectUri);

      expect(result1.state).not.toBe(result2.state);
      expect(result1.authUrl).not.toBe(result2.authUrl);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should successfully exchange authorization code for tokens', async () => {
      const mockCode = 'auth-code-123';
      const _mockState = 'test-state-123';
      const mockTokenResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 7200,
        token_type: 'bearer'
      };

      // First create a state to validate against
      const { state } = await twitterService.getAuthUrl(mockRedirectUri);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      });

      const result = await twitterService.exchangeCodeForTokens(mockCode, mockRedirectUri, state);

      expect(result).toMatchObject({
        accessToken: mockTokenResponse.access_token,
        refreshToken: mockTokenResponse.refresh_token,
        expiresAt: expect.any(Number)
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.x.com/2/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should throw error for invalid state', async () => {
      const mockCode = 'auth-code-123';
      const invalidState = 'invalid-state';

      await expect(twitterService.exchangeCodeForTokens(mockCode, mockRedirectUri, invalidState))
        .rejects.toThrow('Invalid state parameter');
    });

    it('should throw error when token exchange fails', async () => {
      const mockCode = 'invalid-code';
      const { state } = await twitterService.getAuthUrl(mockRedirectUri);

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      await expect(twitterService.exchangeCodeForTokens(mockCode, mockRedirectUri, state))
        .rejects.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should successfully fetch user profile', async () => {
      const mockAccessToken = 'access-token-123';
      const mockUserResponse = {
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User',
          profile_image_url: 'https://example.com/avatar.jpg',
          verified: true,
          public_metrics: {
            followers_count: 1000,
            following_count: 500
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserResponse
      });

      const result = await twitterService.getUserProfile(mockAccessToken);

      expect(result).toMatchObject({
        id: '123456789',
        username: 'testuser',
        displayName: 'Test User',
        profileImageUrl: 'https://example.com/avatar.jpg',
        verified: true,
        followersCount: 1000,
        followingCount: 500
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.x.com/2/users/me?user.fields=profile_image_url,verified,public_metrics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`
          })
        })
      );
    });

    it('should throw error when user profile fetch fails', async () => {
      const mockAccessToken = 'invalid-token';

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      await expect(twitterService.getUserProfile(mockAccessToken))
        .rejects.toThrow();
    });

    it('should handle missing user data in response', async () => {
      const mockAccessToken = 'access-token-123';
      const mockUserResponse = {
        errors: [{ message: 'User not found' }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserResponse
      });

      await expect(twitterService.getUserProfile(mockAccessToken))
        .rejects.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const mockRefreshToken = 'refresh-token-123';
      const mockTokenResponse = {
        access_token: 'new-access-token-123',
        refresh_token: 'new-refresh-token-123',
        expires_in: 7200,
        token_type: 'bearer'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      });

      const result = await twitterService.refreshAccessToken(mockRefreshToken);

      expect(result).toMatchObject({
        accessToken: mockTokenResponse.access_token,  
        refreshToken: mockTokenResponse.refresh_token,
        expiresAt: expect.any(Number)
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.x.com/2/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should throw error when token refresh fails', async () => {
      const mockRefreshToken = 'invalid-refresh-token';

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid refresh token'
      });

      await expect(twitterService.refreshAccessToken(mockRefreshToken))
        .rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON responses', async () => {
      const mockAccessToken = 'access-token-123';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(twitterService.getUserProfile(mockAccessToken))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle fetch network failures', async () => {
      const mockCode = 'auth-code-123';
      const { state } = await twitterService.getAuthUrl('https://example.com/callback');

      (global.fetch as any).mockRejectedValueOnce(new Error('ERR_NETWORK'));

      await expect(twitterService.exchangeCodeForTokens(mockCode, 'https://example.com/callback', state))
        .rejects.toThrow('ERR_NETWORK');
    });
  });
});