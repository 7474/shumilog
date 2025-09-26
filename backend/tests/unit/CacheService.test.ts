import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../../src/services/CacheService.js';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', () => {
      const key = 'test_key';
      const data = { message: 'Hello, World!' };

      cacheService.set(key, data);
      const retrieved = cacheService.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non_existent_key');
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      cacheService.set('string', 'test');
      cacheService.set('number', 42);
      cacheService.set('boolean', true);
      cacheService.set('array', [1, 2, 3]);
      cacheService.set('object', { a: 1, b: 2 });

      expect(cacheService.get('string')).toBe('test');
      expect(cacheService.get('number')).toBe(42);
      expect(cacheService.get('boolean')).toBe(true);
      expect(cacheService.get('array')).toEqual([1, 2, 3]);
      expect(cacheService.get('object')).toEqual({ a: 1, b: 2 });
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL and expire data', () => {
      const key = 'expiring_key';
      const data = { value: 'expires soon' };
      const ttl = 1000; // 1 second

      cacheService.set(key, data, ttl);

      // Should be available immediately
      expect(cacheService.get(key)).toEqual(data);

      // Fast forward time past TTL
      vi.advanceTimersByTime(1001);

      // Should be expired and return null
      expect(cacheService.get(key)).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const key = 'default_ttl_key';
      const data = { value: 'default ttl' };

      cacheService.set(key, data); // No TTL specified, should use default (5 minutes)

      // Should be available immediately
      expect(cacheService.get(key)).toEqual(data);

      // Fast forward 4 minutes - should still be available
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(cacheService.get(key)).toEqual(data);

      // Fast forward past default TTL (5 minutes + 1ms)
      vi.advanceTimersByTime(60 * 1000 + 1);
      expect(cacheService.get(key)).toBeNull();
    });

    it('should handle different TTL values correctly', () => {
      cacheService.set('short', 'data1', 100);
      cacheService.set('medium', 'data2', 500);
      cacheService.set('long', 'data3', 1000);

      // All should be available initially
      expect(cacheService.get('short')).toBe('data1');
      expect(cacheService.get('medium')).toBe('data2');
      expect(cacheService.get('long')).toBe('data3');

      // After 150ms, only short should expire
      vi.advanceTimersByTime(150);
      expect(cacheService.get('short')).toBeNull();
      expect(cacheService.get('medium')).toBe('data2');
      expect(cacheService.get('long')).toBe('data3');

      // After 600ms total, medium should also expire
      vi.advanceTimersByTime(450);
      expect(cacheService.get('short')).toBeNull();
      expect(cacheService.get('medium')).toBeNull();
      expect(cacheService.get('long')).toBe('data3');

      // After 1100ms total, all should expire
      vi.advanceTimersByTime(500);
      expect(cacheService.get('short')).toBeNull();
      expect(cacheService.get('medium')).toBeNull();
      expect(cacheService.get('long')).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(() => {
      // Setup test data
      cacheService.set('user_123_profile', { name: 'John' });
      cacheService.set('user_123_logs', [{ id: 1 }]);
      cacheService.set('user_456_profile', { name: 'Jane' });
      cacheService.set('popular_tags', [{ name: 'anime' }]);
      cacheService.set('recent_logs', [{ id: 2 }]);
    });

    it('should invalidate entries matching pattern', () => {
      // Verify initial state
      expect(cacheService.get('user_123_profile')).toEqual({ name: 'John' });
      expect(cacheService.get('user_123_logs')).toEqual([{ id: 1 }]);
      expect(cacheService.get('user_456_profile')).toEqual({ name: 'Jane' });
      expect(cacheService.get('popular_tags')).toEqual([{ name: 'anime' }]);

      // Invalidate all user_123 entries
      cacheService.invalidate('user_123');

      // user_123 entries should be gone
      expect(cacheService.get('user_123_profile')).toBeNull();
      expect(cacheService.get('user_123_logs')).toBeNull();

      // Other entries should remain
      expect(cacheService.get('user_456_profile')).toEqual({ name: 'Jane' });
      expect(cacheService.get('popular_tags')).toEqual([{ name: 'anime' }]);
    });

    it('should invalidate multiple matching patterns', () => {
      cacheService.invalidate('tags');

      expect(cacheService.get('popular_tags')).toBeNull();
      expect(cacheService.get('user_123_profile')).toEqual({ name: 'John' });
      expect(cacheService.get('recent_logs')).toEqual([{ id: 2 }]);
    });

    it('should handle invalidation of non-matching patterns', () => {
      cacheService.invalidate('non_existent_pattern');

      // All entries should remain
      expect(cacheService.get('user_123_profile')).toEqual({ name: 'John' });
      expect(cacheService.get('popular_tags')).toEqual([{ name: 'anime' }]);
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache entries', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      // Verify entries exist
      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toBe('value2');
      expect(cacheService.get('key3')).toBe('value3');

      // Clear cache
      cacheService.clear();

      // All entries should be gone
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
      expect(cacheService.get('key3')).toBeNull();
    });

    it('should provide cache statistics', () => {
      cacheService.set('stat_key1', 'value1');
      cacheService.set('stat_key2', 'value2');

      const stats = cacheService.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('stat_key1');
      expect(stats.keys).toContain('stat_key2');
    });

    it('should update statistics when entries expire', () => {
      cacheService.set('expiring', 'value', 100);

      let stats = cacheService.getStats();
      expect(stats.size).toBe(1);

      // Fast forward past expiry
      vi.advanceTimersByTime(150);

      // Access expired entry to trigger cleanup
      cacheService.get('expiring');

      stats = cacheService.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large numbers of cache entries efficiently', () => {
      const startTime = performance.now();

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`key_${i}`, { id: i, data: `value_${i}` });
      }

      const setTime = performance.now() - startTime;

      // Retrieve all entries
      const retrieveStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        cacheService.get(`key_${i}`);
      }
      const retrieveTime = performance.now() - retrieveStartTime;

      // Operations should be fast (less than 100ms for 1000 entries)
      expect(setTime).toBeLessThan(100);
      expect(retrieveTime).toBeLessThan(100);

      const stats = cacheService.getStats();
      expect(stats.size).toBe(1000);
    });

    it('should handle pattern invalidation efficiently with many entries', () => {
      // Add entries with different patterns
      for (let i = 0; i < 500; i++) {
        cacheService.set(`user_${i}_profile`, { id: i });
        cacheService.set(`tag_${i}_data`, { tag: i });
      }

      const startTime = performance.now();
      cacheService.invalidate('user_');
      const invalidateTime = performance.now() - startTime;

      // Should complete quickly
      expect(invalidateTime).toBeLessThan(50);

      // Verify correct entries were invalidated
      expect(cacheService.get('user_1_profile')).toBeNull();
      expect(cacheService.get('tag_1_data')).not.toBeNull();

      const stats = cacheService.getStats();
      expect(stats.size).toBe(500); // Only tag entries should remain
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      cacheService.set('null_key', null);
      cacheService.set('undefined_key', undefined);

      expect(cacheService.get('null_key')).toBeNull();
      expect(cacheService.get('undefined_key')).toBeUndefined();
    });

    it('should handle empty strings and objects', () => {
      cacheService.set('empty_string', '');
      cacheService.set('empty_object', {});
      cacheService.set('empty_array', []);

      expect(cacheService.get('empty_string')).toBe('');
      expect(cacheService.get('empty_object')).toEqual({});
      expect(cacheService.get('empty_array')).toEqual([]);
    });

    it('should handle zero TTL', () => {
      cacheService.set('zero_ttl', 'value', 0);
      
      // Should expire immediately
      expect(cacheService.get('zero_ttl')).toBeNull();
    });

    it('should handle negative TTL', () => {
      cacheService.set('negative_ttl', 'value', -1000);
      
      // Should expire immediately
      expect(cacheService.get('negative_ttl')).toBeNull();
    });
  });
});