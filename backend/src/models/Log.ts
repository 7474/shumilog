/**
 * Log model with Markdown content
 * 
 * Represents user-generated content logs for anime, manga, games, etc.
 */

export interface Log {
  id: number;
  user_id: number;
  title: string;
  content: string;
  content_html: string;
  privacy: 'public' | 'private';
  created_at: string;
  updated_at: string;
  published_at?: string;
  episode_number?: number;
  season_number?: number;
  rating?: number;
  status: LogStatus;
  view_count: number;
  share_count: number;
  metadata: LogMetadata;
}

export type LogStatus = 
  | 'draft'
  | 'published'
  | 'archived'
  | 'deleted';

export interface LogMetadata {
  // Media progress tracking
  progress?: {
    current_episode?: number;
    total_episodes?: number;
    current_chapter?: number;
    total_chapters?: number;
    completion_percentage?: number;
  };
  
  // Timestamps
  started_at?: string;
  completed_at?: string;
  
  // Ratings breakdown
  ratings?: {
    story?: number;
    characters?: number;
    animation?: number;
    music?: number;
    overall?: number;
  };
  
  // External references
  references?: {
    mal_id?: number;
    anilist_id?: number;
    external_url?: string;
  };
  
  // Social sharing
  shared_to?: {
    twitter?: {
      post_id?: string;
      shared_at?: string;
    };
  };
  
  // Images and media
  images?: string[];
  cover_image?: string;
  
  // Custom fields
  [key: string]: any;
}

export interface CreateLogData {
  title: string;
  content: string;
  privacy?: 'public' | 'private';
  episode_number?: number;
  season_number?: number;
  rating?: number;
  tag_ids?: number[];
  new_tags?: string[];
  metadata?: Partial<LogMetadata>;
}

export interface UpdateLogData {
  title?: string;
  content?: string;
  privacy?: 'public' | 'private';
  episode_number?: number;
  season_number?: number;
  rating?: number;
  tag_ids?: number[];
  status?: LogStatus;
  metadata?: Partial<LogMetadata>;
}

export interface LogSearchParams {
  user_id?: number;
  tag_ids?: number[];
  privacy?: 'public' | 'private';
  status?: LogStatus;
  search?: string;
  episode_number?: number;
  season_number?: number;
  rating_min?: number;
  rating_max?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'rating' | 'view_count';
  sort_order?: 'asc' | 'desc';
}

/**
 * Database schema for logs table
 */
export const LOG_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT NOT NULL,
    privacy TEXT DEFAULT 'private',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    episode_number INTEGER,
    season_number INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status TEXT DEFAULT 'published',
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}', -- JSON string
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_logs_privacy ON logs(privacy);
  CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
  CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_updated_at ON logs(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_published_at ON logs(published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_rating ON logs(rating);
  CREATE INDEX IF NOT EXISTS idx_logs_episode ON logs(episode_number, season_number);
  CREATE INDEX IF NOT EXISTS idx_logs_user_privacy ON logs(user_id, privacy);
  CREATE INDEX IF NOT EXISTS idx_logs_public_published ON logs(privacy, status, published_at DESC);
`;

/**
 * Utility functions for Log model
 */
export class LogModel {
  /**
   * Parse log metadata from JSON string
   */
  static parseMetadata(metadataJson: string): LogMetadata {
    try {
      return JSON.parse(metadataJson) || {};
    } catch {
      return {};
    }
  }

  /**
   * Serialize log metadata to JSON string
   */
  static serializeMetadata(metadata: Partial<LogMetadata>): string {
    return JSON.stringify(metadata || {});
  }

  /**
   * Validate rating value
   */
  static isValidRating(rating: number): boolean {
    return Number.isInteger(rating) && rating >= 1 && rating <= 5;
  }

  /**
   * Validate episode/season numbers
   */
  static isValidEpisodeNumber(episode: number): boolean {
    return Number.isInteger(episode) && episode > 0;
  }

  static isValidSeasonNumber(season: number): boolean {
    return Number.isInteger(season) && season > 0;
  }

  /**
   * Generate content preview (first N characters)
   */
  static generatePreview(content: string, maxLength = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Check if log is publicly accessible
   */
  static isPubliclyAccessible(log: Log): boolean {
    return log.privacy === 'public' && log.status === 'published';
  }

  /**
   * Check if user can access log
   */
  static canUserAccess(log: Log, userId?: number): boolean {
    // Public logs are accessible to everyone
    if (LogModel.isPubliclyAccessible(log)) {
      return true;
    }
    
    // Private logs only accessible to owner
    return userId !== undefined && log.user_id === userId;
  }

  /**
   * Check if user can edit log
   */
  static canUserEdit(log: Log, userId?: number): boolean {
    return userId !== undefined && log.user_id === userId;
  }

  /**
   * Update view count
   */
  static incrementViewCount(log: Log): Log {
    return {
      ...log,
      view_count: log.view_count + 1,
    };
  }

  /**
   * Update share count
   */
  static incrementShareCount(log: Log): Log {
    return {
      ...log,
      share_count: log.share_count + 1,
    };
  }

  /**
   * Build search query for logs
   */
  static buildSearchQuery(params: LogSearchParams): { query: string; countQuery: string } {
    const conditions: string[] = [];
    const sqlParams: any[] = [];

    // Always filter out deleted logs
    conditions.push("status != 'deleted'");

    if (params.user_id !== undefined) {
      conditions.push('user_id = ?');
      sqlParams.push(params.user_id);
    }

    if (params.privacy) {
      conditions.push('privacy = ?');
      sqlParams.push(params.privacy);
    }

    if (params.status) {
      conditions.push('status = ?');
      sqlParams.push(params.status);
    }

    if (params.search) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      sqlParams.push(`%${params.search}%`, `%${params.search}%`);
    }

    if (params.episode_number !== undefined) {
      conditions.push('episode_number = ?');
      sqlParams.push(params.episode_number);
    }

    if (params.season_number !== undefined) {
      conditions.push('season_number = ?');
      sqlParams.push(params.season_number);
    }

    if (params.rating_min !== undefined) {
      conditions.push('rating >= ?');
      sqlParams.push(params.rating_min);
    }

    if (params.rating_max !== undefined) {
      conditions.push('rating <= ?');
      sqlParams.push(params.rating_max);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';
    const limit = Math.min(params.limit || 20, 100);
    const offset = params.offset || 0;

    const query = `
      SELECT * FROM logs 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM logs 
      ${whereClause}
    `;

    return { query, countQuery };
  }

  /**
   * Calculate reading time estimate
   */
  static estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Extract hashtags from content
   */
  static extractHashtags(content: string): string[] {
    const hashtagRegex = /#([a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
    const hashtags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1]);
    }
    
    return [...new Set(hashtags)]; // Remove duplicates
  }
}