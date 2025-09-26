/**
 * Performance monitoring utility for tracking operation durations
 */
export class PerformanceMonitor {
  /**
   * Measure and log the duration of an async operation
   */
  static async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    logSlow: boolean = true,
    slowThresholdMs: number = 100
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      // Log operation timing
      console.log(`${operationName}: ${duration.toFixed(2)}ms`);
      
      // Log slow operations as warnings
      if (logSlow && duration > slowThresholdMs) {
        console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
  
  /**
   * Create a timer for manual timing
   */
  static createTimer(name: string) {
    const start = performance.now();
    
    return {
      stop: () => {
        const duration = performance.now() - start;
        console.log(`${name}: ${duration.toFixed(2)}ms`);
        return duration;
      },
      lap: (lapName: string) => {
        const duration = performance.now() - start;
        console.log(`${name} - ${lapName}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }
}

/**
 * Response optimization utilities
 */
export class ResponseOptimizer {
  /**
   * Optimize log response format for consistent structure
   */
  static optimizeLogResponse(log: any): any {
    return {
      id: log.id,
      title: log.title,
      content_md: log.content_md,
      is_public: log.is_public,
      created_at: log.created_at,
      updated_at: log.updated_at,
      user: {
        id: log.user_id,
        twitter_username: log.twitter_username,
        display_name: log.display_name,
        avatar_url: log.avatar_url
      },
      ...(log.tag_ids && {
        associated_tags: this.parseTagsFromConcatenated(log.tag_ids, log.tag_names)
      })
    };
  }
  
  /**
   * Parse concatenated tag data from GROUP_CONCAT queries
   */
  private static parseTagsFromConcatenated(ids: string, names: string) {
    if (!ids || !names) return [];
    
    const idArray = ids.split(',');
    const nameArray = names.split(',');
    
    return idArray.map((id, index) => ({
      id: id.trim(),
      name: nameArray[index]?.trim() || ''
    }));
  }
  
  /**
   * Optimize tag response format
   */
  static optimizeTagResponse(tag: any): any {
    return {
      id: tag.id,
      name: tag.name,
      description: tag.description,
      metadata: tag.metadata ? JSON.parse(tag.metadata) : {},
      created_by: tag.created_by,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
      ...(tag.usage_count !== undefined && {
        usage_stats: {
          usage_count: tag.usage_count
        }
      })
    };
  }
}

/**
 * Pagination utilities for cursor-based pagination
 */
export class PaginationService {
  /**
   * Build cursor-based query for efficient pagination
   */
  static buildCursorQuery(
    baseQuery: string,
    cursor?: string,
    limit: number = 25,
    sortField: string = 'created_at'
  ) {
    let query = baseQuery;
    let params: any[] = [];
    
    if (cursor) {
      query += ` AND ${sortField} < ?`;
      params.push(cursor);
    }
    
    query += ` ORDER BY ${sortField} DESC LIMIT ?`;
    params.push(limit + 1); // Get one extra to determine if there are more
    
    return { query, params };
  }
  
  /**
   * Format paginated response with cursor information
   */
  static formatPaginatedResponse<T>(
    items: T[],
    limit: number,
    sortField?: string
  ) {
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    
    return {
      items: data,
      total: data.length,
      hasMore,
      ...(hasMore && sortField && data.length > 0 && {
        nextCursor: (data[data.length - 1] as any)[sortField]
      })
    };
  }
}

/**
 * Search optimization utilities
 */
export class SearchService {
  /**
   * Build optimized search query with relevance scoring
   */
  static buildSearchQuery(searchTerm: string, isPublicOnly: boolean = true) {
    const searchQuery = `%${searchTerm.toLowerCase()}%`;
    
    let query = `
      SELECT l.id, l.title, l.content_md, l.created_at, l.updated_at, l.is_public,
             u.id as user_id, u.twitter_username, u.display_name, u.avatar_url,
             -- Search relevance scoring
             (CASE 
               WHEN LOWER(l.title) LIKE ? THEN 3
               WHEN LOWER(l.content_md) LIKE ? THEN 2
               ELSE 1
             END) as relevance_score
      FROM logs l
      INNER JOIN users u ON l.user_id = u.id
      WHERE (LOWER(l.title) LIKE ? OR LOWER(l.content_md) LIKE ?)
    `;
    
    let params = [searchQuery, searchQuery, searchQuery, searchQuery];
    
    if (isPublicOnly) {
      query += ' AND l.is_public = true';
    }
    
    query += ` ORDER BY relevance_score DESC, l.created_at DESC`;
    
    return { query, params };
  }
}