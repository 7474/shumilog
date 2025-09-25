/**
 * UserTagProgress model for content tracking
 * 
 * Tracks user's progress and status with various content (anime series, manga, etc.)
 */

export interface UserTagProgress {
  id: number;
  user_id: number;
  tag_id: number;
  status: ProgressStatus;
  progress: ProgressData;
  started_at?: string;
  completed_at?: string;
  last_updated: string;
  rating?: number;
  is_favorite: boolean;
  metadata: UserTagProgressMetadata;
}

export type ProgressStatus = 
  | 'planning' // Want to watch/read
  | 'current' // Currently watching/reading
  | 'completed' // Finished
  | 'paused' // On hold
  | 'dropped' // Discontinued
  | 'rewatching' // Watching again
  | 'rereading'; // Reading again

export interface ProgressData {
  // Episode/Chapter tracking
  current_episode?: number;
  total_episodes?: number;
  current_chapter?: number;
  total_chapters?: number;
  current_volume?: number;
  total_volumes?: number;
  
  // Season tracking for anime
  current_season?: number;
  total_seasons?: number;
  
  // Time tracking
  time_spent_minutes?: number;
  sessions_count?: number;
  
  // Completion percentage (calculated)
  completion_percentage?: number;
  
  // Custom progress markers
  custom_progress?: {
    [key: string]: number | string | boolean;
  };
}

export interface UserTagProgressMetadata {
  // Personal notes
  notes?: string;
  
  // Rating breakdown
  ratings?: {
    story?: number;
    characters?: number;
    art_animation?: number;
    music_sound?: number;
    enjoyment?: number;
    overall?: number;
  };
  
  // Tracking source
  source: 'manual' | 'auto' | 'import';
  imported_from?: string; // MAL, AniList, etc.
  external_id?: string;
  
  // Social features
  shared_publicly?: boolean;
  review_posted?: boolean;
  
  // Reminders and goals
  reminders?: {
    next_episode_date?: string;
    reminder_frequency?: 'daily' | 'weekly' | 'monthly';
  };
  
  // Custom metadata
  [key: string]: any;
}

export interface CreateUserTagProgressData {
  user_id: number;
  tag_id: number;
  status?: ProgressStatus;
  progress?: Partial<ProgressData>;
  rating?: number;
  is_favorite?: boolean;
  metadata?: Partial<UserTagProgressMetadata>;
}

export interface UpdateUserTagProgressData {
  status?: ProgressStatus;
  progress?: Partial<ProgressData>;
  rating?: number;
  is_favorite?: boolean;
  metadata?: Partial<UserTagProgressMetadata>;
}

export interface UserTagProgressSearchParams {
  user_id?: number;
  tag_id?: number;
  status?: ProgressStatus;
  is_favorite?: boolean;
  min_rating?: number;
  max_rating?: number;
  tag_category?: string;
  completed_after?: string;
  completed_before?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'last_updated' | 'started_at' | 'completed_at' | 'rating';
  sort_order?: 'asc' | 'desc';
}

/**
 * Database schema for user_tag_progress table
 */
export const USER_TAG_PROGRESS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS user_tag_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    status TEXT DEFAULT 'planning',
    progress TEXT DEFAULT '{}', -- JSON string
    started_at DATETIME,
    completed_at DATETIME,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_favorite BOOLEAN DEFAULT 0,
    metadata TEXT DEFAULT '{}', -- JSON string
    UNIQUE(user_id, tag_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_user_id ON user_tag_progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_tag_id ON user_tag_progress(tag_id);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_status ON user_tag_progress(status);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_rating ON user_tag_progress(rating);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_favorite ON user_tag_progress(is_favorite);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_last_updated ON user_tag_progress(last_updated DESC);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_completed_at ON user_tag_progress(completed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_user_tag_progress_user_status ON user_tag_progress(user_id, status);
`;

/**
 * Utility functions for UserTagProgress model
 */
export class UserTagProgressModel {
  /**
   * Parse progress data from JSON string
   */
  static parseProgress(progressJson: string): ProgressData {
    try {
      return JSON.parse(progressJson) || {};
    } catch {
      return {};
    }
  }

  /**
   * Serialize progress data to JSON string
   */
  static serializeProgress(progress: Partial<ProgressData>): string {
    return JSON.stringify(progress || {});
  }

  /**
   * Parse metadata from JSON string
   */
  static parseMetadata(metadataJson: string): UserTagProgressMetadata {
    try {
      const parsed = JSON.parse(metadataJson);
      return { source: 'manual', ...parsed };
    } catch {
      return { source: 'manual' };
    }
  }

  /**
   * Serialize metadata to JSON string
   */
  static serializeMetadata(metadata: Partial<UserTagProgressMetadata>): string {
    return JSON.stringify(metadata || { source: 'manual' });
  }

  /**
   * Calculate completion percentage
   */
  static calculateCompletionPercentage(progress: ProgressData): number {
    // Episode-based completion
    if (progress.current_episode && progress.total_episodes) {
      return Math.min((progress.current_episode / progress.total_episodes) * 100, 100);
    }
    
    // Chapter-based completion
    if (progress.current_chapter && progress.total_chapters) {
      return Math.min((progress.current_chapter / progress.total_chapters) * 100, 100);
    }
    
    // Volume-based completion
    if (progress.current_volume && progress.total_volumes) {
      return Math.min((progress.current_volume / progress.total_volumes) * 100, 100);
    }
    
    return 0;
  }

  /**
   * Update progress data with completion percentage
   */
  static enrichProgressData(progress: ProgressData): ProgressData {
    const enriched = { ...progress };
    enriched.completion_percentage = UserTagProgressModel.calculateCompletionPercentage(progress);
    return enriched;
  }

  /**
   * Check if user has completed the content
   */
  static isCompleted(progress: UserTagProgress): boolean {
    return progress.status === 'completed' || 
           UserTagProgressModel.calculateCompletionPercentage(progress.progress) >= 100;
  }

  /**
   * Check if user is currently watching/reading
   */
  static isCurrent(progress: UserTagProgress): boolean {
    return progress.status === 'current' || progress.status === 'rewatching' || progress.status === 'rereading';
  }

  /**
   * Get user's progress summary
   */
  static buildUserProgressSummaryQuery(userId: number): string {
    return `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN is_favorite = 1 THEN 1 END) as favorites_count
      FROM user_tag_progress utp
      JOIN tags t ON utp.tag_id = t.id
      WHERE utp.user_id = ?
        AND t.is_active = 1
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'current' THEN 1
          WHEN 'completed' THEN 2
          WHEN 'planning' THEN 3
          WHEN 'paused' THEN 4
          WHEN 'dropped' THEN 5
          WHEN 'rewatching' THEN 6
          WHEN 'rereading' THEN 7
          ELSE 8
        END
    `;
  }

  /**
   * Get user's progress by category
   */
  static buildUserProgressByCategoryQuery(userId: number): string {
    return `
      SELECT 
        t.category,
        COUNT(*) as total_count,
        COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN utp.status = 'current' THEN 1 END) as current_count,
        AVG(utp.rating) as avg_rating,
        COUNT(CASE WHEN utp.is_favorite = 1 THEN 1 END) as favorites_count
      FROM user_tag_progress utp
      JOIN tags t ON utp.tag_id = t.id
      WHERE utp.user_id = ?
        AND t.is_active = 1
      GROUP BY t.category
      ORDER BY total_count DESC
    `;
  }

  /**
   * Get recently updated progress
   */
  static buildRecentProgressQuery(userId: number, days = 7): string {
    return `
      SELECT 
        utp.*,
        t.name as tag_name,
        t.category as tag_category,
        t.metadata as tag_metadata
      FROM user_tag_progress utp
      JOIN tags t ON utp.tag_id = t.id
      WHERE utp.user_id = ?
        AND utp.last_updated >= datetime('now', '-${days} days')
        AND t.is_active = 1
      ORDER BY utp.last_updated DESC
    `;
  }

  /**
   * Get completion streaks
   */
  static buildCompletionStreakQuery(userId: number): string {
    return `
      WITH completion_dates AS (
        SELECT 
          DATE(completed_at) as completion_date,
          COUNT(*) as completions_count
        FROM user_tag_progress
        WHERE user_id = ?
          AND status = 'completed'
          AND completed_at IS NOT NULL
        GROUP BY DATE(completed_at)
        ORDER BY completion_date DESC
      ),
      streak_calculation AS (
        SELECT 
          completion_date,
          completions_count,
          ROW_NUMBER() OVER (ORDER BY completion_date DESC) as row_num,
          julianday('now') - julianday(completion_date) as days_ago
        FROM completion_dates
      )
      SELECT 
        COUNT(*) as current_streak_days,
        SUM(completions_count) as current_streak_completions,
        MIN(completion_date) as streak_start_date,
        MAX(completion_date) as streak_end_date
      FROM streak_calculation
      WHERE days_ago = row_num - 1  -- Consecutive days
    `;
  }

  /**
   * Find users with similar progress patterns
   */
  static buildSimilarUsersQuery(userId: number, minSharedItems = 5): string {
    return `
      WITH user_tags AS (
        SELECT tag_id, status, rating
        FROM user_tag_progress
        WHERE user_id = ?
      ),
      similar_users AS (
        SELECT 
          utp.user_id,
          COUNT(*) as shared_items,
          COUNT(CASE WHEN utp.status = ut.status THEN 1 END) as same_status_count,
          AVG(ABS(COALESCE(utp.rating, 3) - COALESCE(ut.rating, 3))) as avg_rating_difference
        FROM user_tag_progress utp
        JOIN user_tags ut ON utp.tag_id = ut.tag_id
        WHERE utp.user_id != ?
        GROUP BY utp.user_id
        HAVING COUNT(*) >= ?
      )
      SELECT 
        su.*,
        u.twitter_display_name,
        u.twitter_username
      FROM similar_users su
      JOIN users u ON su.user_id = u.id
      WHERE u.is_active = 1
      ORDER BY 
        su.shared_items DESC,
        su.same_status_count DESC,
        su.avg_rating_difference ASC
    `;
  }

  /**
   * Get trending content by completion activity
   */
  static buildTrendingContentQuery(days = 30): string {
    return `
      SELECT 
        t.*,
        COUNT(utp.id) as recent_activity,
        COUNT(CASE WHEN utp.status = 'completed' THEN 1 END) as recent_completions,
        COUNT(CASE WHEN utp.status = 'current' THEN 1 END) as currently_watching,
        AVG(utp.rating) as avg_rating
      FROM user_tag_progress utp
      JOIN tags t ON utp.tag_id = t.id
      WHERE utp.last_updated >= datetime('now', '-${days} days')
        AND t.is_active = 1
        AND t.category IN ('anime', 'manga', 'game', 'movie', 'tv')
      GROUP BY t.id
      HAVING recent_activity >= 3
      ORDER BY recent_activity DESC, recent_completions DESC
    `;
  }
}