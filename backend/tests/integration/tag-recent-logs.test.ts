import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  setupTestEnvironment
} from '../helpers/app';

/**
 * Integration test: Tag detail with recent logs
 * 
 * Verifies that tag detail endpoint returns recent public logs
 * associated with the tag.
 */
describe('Integration: Tag Recent Logs', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  it('should return recent logs for a tag', async () => {
    await setupTestEnvironment();

    // Fetch tag detail
    const response = await app.request('/tags/tag_anime', { method: 'GET' });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');

    const tag = await response.json();
    
    // Verify recent_logs field exists
    expect(tag).toHaveProperty('recent_logs');
    expect(Array.isArray(tag.recent_logs)).toBe(true);
    
    // Verify logs are public only
    tag.recent_logs.forEach((log: any) => {
      expect(log.is_public).toBe(true);
      expect(log.privacy).toBe('public');
    });

    // Verify log structure matches API spec
    if (tag.recent_logs.length > 0) {
      const log = tag.recent_logs[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('title');
      expect(log).toHaveProperty('content_md');
      expect(log).toHaveProperty('created_at');
      expect(log).toHaveProperty('updated_at');
      expect(log).toHaveProperty('user');
      expect(log).toHaveProperty('associated_tags');
      
      // Verify user structure
      expect(log.user).toHaveProperty('id');
      expect(log.user).toHaveProperty('display_name');
      
      // Verify tags array
      expect(Array.isArray(log.associated_tags)).toBe(true);
    }
  });

  it('should limit recent logs to 10 items', async () => {
    await setupTestEnvironment();

    const response = await app.request('/tags/tag_anime', { method: 'GET' });
    const tag = await response.json();

    // Should not return more than 10 logs
    expect(tag.recent_logs.length).toBeLessThanOrEqual(10);
  });

  it('should sort recent logs by creation date descending', async () => {
    await setupTestEnvironment();

    const response = await app.request('/tags/tag_anime', { method: 'GET' });
    const tag = await response.json();

    if (tag.recent_logs.length > 1) {
      // Verify logs are sorted by created_at descending
      for (let i = 0; i < tag.recent_logs.length - 1; i++) {
        const current = new Date(tag.recent_logs[i].created_at).getTime();
        const next = new Date(tag.recent_logs[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });

  it('should include images array in recent logs', async () => {
    await setupTestEnvironment();

    const response = await app.request('/tags/tag_anime', { method: 'GET' });
    const tag = await response.json();

    // Verify images field exists for all logs
    tag.recent_logs.forEach((log: any) => {
      expect(log).toHaveProperty('images');
      expect(Array.isArray(log.images)).toBe(true);
    });
  });
});
