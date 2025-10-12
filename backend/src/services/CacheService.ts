interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  size: number;
  keys: string[];
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Store a value in the cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const resolvedTTL = ttl ?? this.defaultTTL;
    
    // If TTL is 0 or negative, don't store the value at all
    if (resolvedTTL <= 0) {
      return;
    }
    
    const expiresAt = Date.now() + resolvedTTL;
    
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  /**
   * Retrieve a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
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
  getStats(): CacheStats {
    // Clean up expired entries first
    this.cleanupExpired();
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > 0 && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}