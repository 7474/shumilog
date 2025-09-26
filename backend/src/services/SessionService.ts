import { Session, SessionModel, CreateSessionData } from '../models/Session.js';
import { Database } from '../db/database.js';

export class SessionService {
  constructor(private db: Database) {}

  /**
   * Issue a new session token for a user
   */
  async issueSession(userId: string, daysToExpire: number = 30): Promise<string> {
    const token = SessionModel.generateToken();
    const expiresAt = SessionModel.createExpiryDate(daysToExpire);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    await stmt.run([token, userId, now, expiresAt]);
    return token;
  }

  /**
   * Validate session token and return session if valid
   */
  async validateSession(token: string): Promise<Session | null> {
    if (!token) {
      return null;
    }

    const row = await this.db.queryFirst(
      'SELECT token, user_id, created_at, expires_at FROM sessions WHERE token = ?',
      [token]
    );

    if (!row) {
      return null;
    }

    const session = SessionModel.fromRow(row);
    
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

    const stmt = this.db.prepare('DELETE FROM sessions WHERE token = ?');
    await stmt.run([token]);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeUserSessions(userId: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE user_id = ?');
    await stmt.run([userId]);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?');
    const result = await stmt.run([now]);
    return result.changes || 0;
  }

  /**
   * Get session by user ID (most recent if multiple)
   */
  async getSessionByUserId(userId: string): Promise<Session | null> {
    const row = await this.db.queryFirst(
      'SELECT token, user_id, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!row) {
      return null;
    }

    const session = SessionModel.fromRow(row);
    
    // Check if session is expired
    if (SessionModel.isExpired(session)) {
      await this.revokeSession(session.token);
      return null;
    }

    return session;
  }
}