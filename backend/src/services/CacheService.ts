/**
 * In-memory caching service for performance optimization
 */
export class CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  /**
   * Store data in cache with TTL
   */
  set(key: string, data: any, ttlMs: number = 300000): void { // 5 minute default
    // Handle zero or negative TTL by setting expiry to past time
    const expiry = ttlMs <= 0 ? Date.now() - 1 : Date.now() + ttlMs;
    
    this.cache.set(key, {
      data,
      expiry
    });
  }
  
  /**
   * Retrieve data from cache
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}