/**
 * User model aligned with minimal data model blueprint
 */

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  twitter_username?: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface CreateUserData {
  twitter_username?: string;
  display_name: string;
  avatar_url?: string;
}

export interface UpdateUserData {
  display_name?: string;
  avatar_url?: string;
}

export const USER_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    twitter_username TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_users_twitter_username ON users(twitter_username);
`;

export class UserModel {
  static isValidTwitterUsername(username: string): boolean {
    return !username || /^[a-zA-Z0-9_]{1,15}$/.test(username);
  }

  static isValidDisplayName(displayName: string): boolean {
    return displayName.length > 0 && displayName.length <= 100;
  }

  static fromRow(row: any): User {
    return {
      id: row.id,
      twitter_username: row.twitter_username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      role: row.role || 'user',
      created_at: row.created_at
    };
  }
}
