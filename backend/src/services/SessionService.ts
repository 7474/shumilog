import type { KVNamespace } from '@cloudflare/workers-types';
import { Session, SessionModel } from '../models/Session.js';

// KVでユーザーIDからセッショントークンのセットを管理するためのキープレフィックス
const USER_SESSIONS_PREFIX = 'user_sessions:';

export class SessionService {
  constructor(private kv: KVNamespace) {}

  /**
   * Issue a new session token for a user
   */
  async issueSession(userId: string, daysToExpire: number = 30): Promise<string> {
    const token = SessionModel.generateToken();
    const expiresAt = SessionModel.createExpiryDate(daysToExpire);
    const now = new Date().toISOString();

    const session: Session = {
      token,
      user_id: userId,
      created_at: now,
      expires_at: expiresAt
    };

    // セッションをKVに保存（TTL付き）
    const ttlSeconds = daysToExpire * 24 * 60 * 60;
    await this.kv.put(`session:${token}`, JSON.stringify(session), {
      expirationTtl: ttlSeconds
    });

    // ユーザーIDからセッションを検索できるようにインデックスを保存
    await this.addTokenToUserIndex(userId, token, ttlSeconds);

    return token;
  }

  /**
   * Validate session token and return session if valid
   */
  async validateSession(token: string): Promise<Session | null> {
    if (!token) {
      return null;
    }

    const sessionJson = await this.kv.get(`session:${token}`);
    if (!sessionJson) {
      return null;
    }

    const session = JSON.parse(sessionJson) as Session;
    
    // Check if session is expired (KV TTLで自動削除されるが念のため確認)
    if (SessionModel.isExpired(session)) {
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

    // セッション情報を取得してユーザーIDを確認
    const sessionJson = await this.kv.get(`session:${token}`);
    if (sessionJson) {
      const session = JSON.parse(sessionJson) as Session;
      await this.removeTokenFromUserIndex(session.user_id, token);
    }

    await this.kv.delete(`session:${token}`);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeUserSessions(userId: string): Promise<void> {
    const tokens = await this.getUserTokens(userId);
    
    // すべてのセッショントークンを削除
    await Promise.all(
      tokens.map(token => this.kv.delete(`session:${token}`))
    );
    
    // ユーザーインデックスを削除
    await this.kv.delete(`${USER_SESSIONS_PREFIX}${userId}`);
  }

  /**
   * Clean up expired sessions
   * KVのTTL機能により自動的に期限切れセッションが削除されるため、このメソッドは何もしない
   */
  async cleanupExpiredSessions(): Promise<number> {
    // KV uses TTL for automatic expiration, so no manual cleanup is needed
    return 0;
  }

  /**
   * Get session by user ID (most recent if multiple)
   */
  async getSessionByUserId(userId: string): Promise<Session | null> {
    const tokens = await this.getUserTokens(userId);
    
    if (tokens.length === 0) {
      return null;
    }

    // すべてのセッションを取得して最新のものを返す
    const sessions: Session[] = [];
    for (const token of tokens) {
      const sessionJson = await this.kv.get(`session:${token}`);
      if (sessionJson) {
        const session = JSON.parse(sessionJson) as Session;
        if (!SessionModel.isExpired(session)) {
          sessions.push(session);
        }
      }
    }

    if (sessions.length === 0) {
      return null;
    }

    // created_atで降順ソート
    sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sessions[0];
  }

  /**
   * ユーザーIDに紐づくセッショントークンのリストを取得
   */
  private async getUserTokens(userId: string): Promise<string[]> {
    const tokensJson = await this.kv.get(`${USER_SESSIONS_PREFIX}${userId}`);
    if (!tokensJson) {
      return [];
    }
    return JSON.parse(tokensJson) as string[];
  }

  /**
   * ユーザーインデックスにトークンを追加
   */
  private async addTokenToUserIndex(userId: string, token: string, ttlSeconds: number): Promise<void> {
    const tokens = await this.getUserTokens(userId);
    if (!tokens.includes(token)) {
      tokens.push(token);
      await this.kv.put(
        `${USER_SESSIONS_PREFIX}${userId}`,
        JSON.stringify(tokens),
        { expirationTtl: ttlSeconds }
      );
    }
  }

  /**
   * ユーザーインデックスからトークンを削除
   */
  private async removeTokenFromUserIndex(userId: string, token: string): Promise<void> {
    const tokens = await this.getUserTokens(userId);
    const newTokens = tokens.filter(t => t !== token);
    
    if (newTokens.length === 0) {
      await this.kv.delete(`${USER_SESSIONS_PREFIX}${userId}`);
    } else {
      // 残りのトークンで最も長いTTLを使用（簡単のため30日固定）
      await this.kv.put(
        `${USER_SESSIONS_PREFIX}${userId}`,
        JSON.stringify(newTokens),
        { expirationTtl: 30 * 24 * 60 * 60 }
      );
    }
  }
}