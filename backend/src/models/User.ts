/**
 * User model matching API specification
 */

export interface User {
  id: string;
  twitter_username: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface CreateUserData {
  twitter_id: string;
  twitter_username: string;
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
    twitter_id TEXT UNIQUE NOT NULL,
    twitter_username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  
  CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
  CREATE INDEX IF NOT EXISTS idx_users_twitter_username ON users(twitter_username);
  CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
`;

export class UserModel {
  static isValidTwitterId(twitterId: string): boolean {
    return /^\d+$/.test(twitterId) && twitterId.length > 0;
  }

  static isValidTwitterUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{1,15}$/.test(username);
  }

  static fromRow(row: any): User {
    return {
      id: row.id,
      twitter_username: row.twitter_username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      created_at: row.created_at
    };
  }
}
