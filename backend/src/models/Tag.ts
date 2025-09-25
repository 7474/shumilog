/**
 * Tag model with metadata JSON field
 * 
 * Represents content tags for organizing logs (anime, manga, games, etc.)
 */

export interface Tag {
  id: number;
  name: string;
  category: TagCategory;
  description?: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
  metadata: TagMetadata;
  parent_id?: number;
  is_active: boolean;
}

export type TagCategory = 
  | 'anime'
  | 'manga' 
  | 'game'
  | 'novel'
  | 'movie'
  | 'tv'
  | 'music'
  | 'character'
  | 'genre'
  | 'studio'
  | 'creator'
  | 'season'
  | 'year'
  | 'rating'
  | 'status'
  | 'general';

export interface TagMetadata {
  // For anime/manga/games
  mal_id?: number;
  anilist_id?: number;
  series_type?: 'tv' | 'ova' | 'movie' | 'special' | 'ona';
  status?: 'airing' | 'completed' | 'upcoming' | 'cancelled';
  start_date?: string;
  end_date?: string;
  episode_count?: number;
  season?: string;
  year?: number;
  
  // For characters/creators
  full_name?: string;
  japanese_name?: string;
  
  // For genres/themes
  parent_genre?: string;
  
  // External links
  external_links?: {
    mal?: string;
    anilist?: string;
    wiki?: string;
    official?: string;
  };
  
  // Images
  image_url?: string;
  banner_url?: string;
  
  // Colors for UI
  color?: string;
  
  // Custom metadata
  [key: string]: any;
}

export interface CreateTagData {
  name: string;
  category: TagCategory;
  description?: string;
  metadata?: Partial<TagMetadata>;
  parent_id?: number;
}

export interface UpdateTagData {
  name?: string;
  category?: TagCategory;
  description?: string;
  metadata?: Partial<TagMetadata>;
  parent_id?: number;
  is_active?: boolean;
}

export interface TagSearchParams {
  search?: string;
  category?: TagCategory;
  parent_id?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'usage_count' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Database schema for tags table
 */
export const TAG_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}', -- JSON string
    parent_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES tags(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
  CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);
  CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON tags(parent_id);
  CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags(is_active);
  CREATE INDEX IF NOT EXISTS idx_tags_category_usage ON tags(category, usage_count DESC);
`;

/**
 * Default tag categories and their metadata schemas
 */
export const TAG_CATEGORY_SCHEMAS: Record<TagCategory, Partial<TagMetadata>> = {
  anime: {
    series_type: 'tv',
    status: 'completed',
    episode_count: 0,
  },
  manga: {
    status: 'completed',
  },
  game: {
    status: 'completed',
  },
  novel: {
    status: 'completed',
  },
  movie: {
    year: new Date().getFullYear(),
  },
  tv: {
    status: 'completed',
  },
  music: {},
  character: {},
  genre: {},
  studio: {},
  creator: {},
  season: {},
  year: {
    year: new Date().getFullYear(),
  },
  rating: {},
  status: {},
  general: {},
};

/**
 * Utility functions for Tag model
 */
export class TagModel {
  /**
   * Parse tag metadata from JSON string
   */
  static parseMetadata(metadataJson: string): TagMetadata {
    try {
      return JSON.parse(metadataJson) || {};
    } catch {
      return {};
    }
  }

  /**
   * Serialize tag metadata to JSON string
   */
  static serializeMetadata(metadata: Partial<TagMetadata>): string {
    return JSON.stringify(metadata || {});
  }

  /**
   * Validate tag name format
   */
  static isValidName(name: string): boolean {
    return /^[a-zA-Z0-9\-_\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{1,100}$/.test(name);
  }

  /**
   * Normalize tag name for storage
   */
  static normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get default metadata for category
   */
  static getDefaultMetadata(category: TagCategory): Partial<TagMetadata> {
    return TAG_CATEGORY_SCHEMAS[category] || {};
  }

  /**
   * Check if tag category supports hierarchies 
   */
  static supportsHierarchy(category: TagCategory): boolean {
    return ['genre', 'character', 'creator', 'general'].includes(category);
  }

  /**
   * Generate tag color based on category
   */
  static getCategoryColor(category: TagCategory): string {
    const colors: Record<TagCategory, string> = {
      anime: '#FF6B6B',
      manga: '#4ECDC4', 
      game: '#45B7D1',
      novel: '#96CEB4',
      movie: '#FECA57',
      tv: '#FF9FF3',
      music: '#54A0FF',
      character: '#5F27CD',
      genre: '#00D2D3',
      studio: '#FF9F43',
      creator: '#6C5CE7',
      season: '#A29BFE',
      year: '#FD79A8',
      rating: '#FDCB6E',
      status: '#6C5CE7',
      general: '#74B9FF',
    };
    return colors[category] || '#74B9FF';
  }

  /**
   * Build search query for tags
   */
  static buildSearchQuery(params: TagSearchParams): string {
    const conditions: string[] = ['is_active = 1'];
    const sqlParams: any[] = [];

    if (params.search) {
      conditions.push('name LIKE ?');
      sqlParams.push(`%${params.search}%`);
    }

    if (params.category) {
      conditions.push('category = ?');
      sqlParams.push(params.category);
    }

    if (params.parent_id !== undefined) {
      if (params.parent_id === null) {
        conditions.push('parent_id IS NULL');
      } else {
        conditions.push('parent_id = ?');
        sqlParams.push(params.parent_id);
      }
    }

    const sortBy = params.sort_by || 'usage_count';
    const sortOrder = params.sort_order || 'desc';
    const limit = Math.min(params.limit || 50, 100);
    const offset = params.offset || 0;

    return `
      SELECT * FROM tags 
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
}