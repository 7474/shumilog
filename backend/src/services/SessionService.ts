export interface Session {
  sessionId: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  createdAt: number;
  lastAccessedAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export class SessionService {
  private readonly kv: any; // Cloudflare KV binding
  private readonly sessionPrefix = 'session:';
  private readonly userSessionPrefix = 'user_session:';
  private readonly defaultTTL = 30 * 24 * 60 * 60; // 30 days in seconds

  constructor(kvBinding?: any) {
    this.kv = kvBinding;
  }

  /**
   * Create a new session
   */
  async createSession(userId: string, tokens?: SessionTokens, metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: Session = {
      sessionId,
      userId,
      accessToken: tokens?.accessToken,
      refreshToken: tokens?.refreshToken,
      expiresAt: tokens?.expiresAt,
      createdAt: now,
      lastAccessedAt: now,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent
    };

    // Store session in KV
    if (this.kv) {
      await this.kv.put(
        `${this.sessionPrefix}${sessionId}`,
        JSON.stringify(session),
        { expirationTtl: this.defaultTTL }
      );

      // Also store user -> session mapping for quick lookups
      await this.kv.put(
        `${this.userSessionPrefix}${userId}`,
        sessionId,
        { expirationTtl: this.defaultTTL }
      );
    }

    return sessionId;
  }

  /**
   * Validate and retrieve session
   */
  async validateSession(sessionId: string): Promise<Session | null> {
    if (!this.kv || !sessionId) {
      return null;
    }

    try {
      const sessionData = await this.kv.get(`${this.sessionPrefix}${sessionId}`);
      if (!sessionData) {
        return null;
      }

      const session: Session = JSON.parse(sessionData);
      
      // Update last accessed time
      session.lastAccessedAt = Date.now();
      await this.kv.put(
        `${this.sessionPrefix}${sessionId}`,
        JSON.stringify(session),
        { expirationTtl: this.defaultTTL }
      );

      return session;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Get session by user ID
   */
  async getSessionByUserId(userId: string): Promise<Session | null> {
    if (!this.kv) {
      return null;
    }

    try {
      const sessionId = await this.kv.get(`${this.userSessionPrefix}${userId}`);
      if (!sessionId) {
        return null;
      }

      return this.validateSession(sessionId);
    } catch (error) {
      console.error('Get session by user ID error:', error);
      return null;
    }
  }

  /**
   * Update session tokens
   */
  async updateSessionTokens(sessionId: string, tokens: SessionTokens): Promise<void> {
    if (!this.kv) {
      return;
    }

    const session = await this.validateSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.accessToken = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.expiresAt = tokens.expiresAt;
    session.lastAccessedAt = Date.now();

    await this.kv.put(
      `${this.sessionPrefix}${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: this.defaultTTL }
    );
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    if (!this.kv || !sessionId) {
      return;
    }

    try {
      // Get session to find user ID
      const session = await this.validateSession(sessionId);
      
      // Remove session
      await this.kv.delete(`${this.sessionPrefix}${sessionId}`);
      
      // Remove user session mapping
      if (session) {
        await this.kv.delete(`${this.userSessionPrefix}${session.userId}`);
      }
    } catch (error) {
      console.error('Session destruction error:', error);
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId: string): Promise<void> {
    if (!this.kv) {
      return;
    }

    try {
      const sessionId = await this.kv.get(`${this.userSessionPrefix}${userId}`);
      if (sessionId) {
        await this.destroySession(sessionId);
      }
    } catch (error) {
      console.error('User session destruction error:', error);
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    if (!this.kv || !sessionId) {
      return false;
    }

    try {
      const sessionData = await this.kv.get(`${this.sessionPrefix}${sessionId}`);
      return sessionData !== null;
    } catch (error) {
      console.error('Session existence check error:', error);
      return false;
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, additionalTTL = this.defaultTTL): Promise<void> {
    const session = await this.validateSession(sessionId);
    if (session) {
      await this.kv.put(
        `${this.sessionPrefix}${sessionId}`,
        JSON.stringify(session),
        { expirationTtl: additionalTTL }
      );
    }
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clean up expired sessions (for local development without KV TTL)
   */
  async cleanupExpiredSessions(): Promise<void> {
    // This would be implemented for local development
    // Cloudflare KV handles TTL automatically
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    activeSessions: number;
    totalSessions: number;
  }> {
    // Placeholder implementation
    // In production, this would query KV for session counts
    return {
      activeSessions: 0,
      totalSessions: 0
    };
  }
}