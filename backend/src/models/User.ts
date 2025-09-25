/**
 * User model with Twitter OAuth fields
 * 
 * Represents a user in the shumilog system authenticated via Twitter OAuth 2.0
 */

export interface User {
  id: number;
  twitter_id: string;
  twitter_username: string;
  twitter_display_name: string;
  twitter_avatar_url?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  last_login: string;
  is_active: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  default_privacy: 'public' | 'private';
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'ja';
  notifications: {
    email_updates: boolean;
    twitter_shares: boolean;
  };
  profile: {
    bio?: string;
    website?: string;
    location?: string;
  };
}

export interface CreateUserData {
  twitter_id: string;
  twitter_username: string;
  twitter_display_name: string;
  twitter_avatar_url?: string;
  email?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserData {
  twitter_display_name?: string;
  twitter_avatar_url?: string;
  email?: string;
  preferences?: Partial<UserPreferences>;
  is_active?: boolean;
}

/**
 * Database schema for users table
 */
export const USER_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitter_id TEXT UNIQUE NOT NULL,
    twitter_username TEXT NOT NULL,
    twitter_display_name TEXT NOT NULL,
    twitter_avatar_url TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    preferences TEXT DEFAULT '{}' -- JSON string
  );

  CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
  CREATE INDEX IF NOT EXISTS idx_users_twitter_username ON users(twitter_username);
  CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
  CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
`;

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  default_privacy: 'private',
  theme: 'auto',
  language: 'en',
  notifications: {
    email_updates: false,
    twitter_shares: true,
  },
  profile: {},
};

/**
 * Utility functions for User model
 */
export class UserModel {
  /**
   * Parse user preferences from JSON string
   */
  static parsePreferences(preferencesJson: string): UserPreferences {
    try {
      const parsed = JSON.parse(preferencesJson);
      return { ...DEFAULT_USER_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_USER_PREFERENCES;
    }
  }

  /**
   * Serialize user preferences to JSON string
   */
  static serializePreferences(preferences: Partial<UserPreferences>): string {
    const merged = { ...DEFAULT_USER_PREFERENCES, ...preferences };
    return JSON.stringify(merged);
  }

  /**
   * Validate Twitter ID format
   */
  static isValidTwitterId(twitterId: string): boolean {
    return /^\d+$/.test(twitterId) && twitterId.length > 0;
  }

  /**
   * Validate Twitter username format
   */
  static isValidTwitterUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{1,15}$/.test(username);
  }

  /**
   * Sanitize user data for API responses
   */
  static sanitizeForApi(user: User): Omit<User, 'email'> {
    const { email, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Check if user owns a resource
   */
  static ownsResource(userId: number, resourceUserId: number): boolean {
    return userId === resourceUserId;
  }
}