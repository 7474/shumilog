/**
 * Session model for KV-based authentication
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

export class SessionModel {
  static isExpired(session: Session): boolean {
    return new Date(session.expires_at) < new Date();
  }

  static generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint32Array(32);
    crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < randomValues.length; i++) {
      result += chars.charAt(randomValues[i] % chars.length);
    }
    return result;
  }

  static createExpiryDate(daysFromNow: number = 30): string {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + daysFromNow);
    return expiry.toISOString();
  }
}