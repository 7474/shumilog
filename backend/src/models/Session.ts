/**
 * Session model for Worker cookie-based authentication
 */

export interface Session {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export interface CreateSessionData {
  user_id: string;
  expires_at: string;
}

export const SESSION_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`;

export class SessionModel {
  static isExpired(session: Session): boolean {
    return new Date(session.expires_at) < new Date();
  }

  static generateToken(): string {
    // Generate a secure random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static createExpiryDate(daysFromNow: number = 30): string {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + daysFromNow);
    return expiry.toISOString();
  }

  static fromRow(row: any): Session {
    return {
      token: row.token,
      user_id: row.user_id,
      created_at: row.created_at,
      expires_at: row.expires_at
    };
  }
}