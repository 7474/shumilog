import { Session, SessionModel } from '../models/Session.js';
import type { DrizzleDB } from '../db/drizzle.js';
import { sessions } from '../db/schema.js';
import { eq, lt, desc } from 'drizzle-orm';

export class SessionService {
  constructor(private db: DrizzleDB) {}

  /**
   * Issue a new session token for a user
   */
  async issueSession(userId: string, daysToExpire: number = 30): Promise<string> {
    const token = SessionModel.generateToken();
    const expiresAt = SessionModel.createExpiryDate(daysToExpire);
    const now = new Date().toISOString();

    await this.db.insert(sessions).values({
      token,
      userId,
      createdAt: now,
      expiresAt,
    });
    
    return token;
  }

  /**
   * Validate session token and return session if valid
   */
  async validateSession(token: string): Promise<Session | null> {
    if (!token) {
      return null;
    }

    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const session: Session = {
      token: row.token,
      user_id: row.userId,
      created_at: row.createdAt,
      expires_at: row.expiresAt,
    };
    
    // Check if session is expired
    if (SessionModel.isExpired(session)) {
      // Clean up expired session
      await this.revokeSession(token);
      return null;
    }

    return session;
  }

  /**
   * Revoke a session token
   */
  async revokeSession(token: string): Promise<void> {
    if (!token) {
      return;
    }

    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeUserSessions(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date().toISOString();
    await this.db.delete(sessions).where(lt(sessions.expiresAt, now));
    // D1 doesn't return changes count, so we return 0
    return 0;
  }

  /**
   * Get session by user ID (most recent if multiple)
   */
  async getSessionByUserId(userId: string): Promise<Session | null> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const session: Session = {
      token: row.token,
      user_id: row.userId,
      created_at: row.createdAt,
      expires_at: row.expiresAt,
    };
    
    // Check if session is expired
    if (SessionModel.isExpired(session)) {
      await this.revokeSession(session.token);
      return null;
    }

    return session;
  }
}