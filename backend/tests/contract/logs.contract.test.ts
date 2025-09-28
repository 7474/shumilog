import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  createTestSession,
  createTestUser,
  seedTestTags,
  seedTestLogs
} from '../helpers/app';

/**
 * Contract Suite: Logs routes
 *
 * These tests define the expected behaviour for the logs endpoints served by the
 * Cloudflare Worker. They intentionally fail today because the Worker is still
 * returning mock data and does not persist to Cloudflare D1 yet.
 */
describe('Contract: Logs routes', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('GET /logs', () => {
    it('lists public logs with author and tag metadata', async () => {
      await seedTestLogs();

      const response = await app.request('/logs', { method: 'GET' });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const payload = await response.json();
      expect(payload).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number)
      });

      expect(payload.total).toBeGreaterThan(0);
      expect(payload.items.length).toBeGreaterThan(0);

      payload.items.forEach((log: any) => {
        expect(log.is_public).toBe(true);
        expect(log).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          content_md: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          author: {
            id: expect.any(String),
            twitter_username: expect.any(String),
            display_name: expect.any(String),
            avatar_url: expect.any(String)
          },
          tags: expect.any(Array)
        });

        log.tags.forEach((tag: any) => {
          expect(tag).toMatchObject({
            id: expect.any(String),
            name: expect.any(String)
          });
        });
      });
    });

    it('filters list by tag_ids', async () => {
      await seedTestLogs();

      const response = await app.request('/logs?tag_ids=tag_anime', { method: 'GET' });
      expect(response.status).toBe(200);

      const payload = await response.json();
      expect(payload.items.length).toBeGreaterThan(0);
      payload.items.forEach((log: any) => {
        const tagIds = (log.tags ?? []).map((tag: any) => tag.id);
        expect(tagIds).toContain('tag_anime');
      });
    });

    it('filters list by user_id', async () => {
      const { ownerId } = await seedTestLogs();

      const response = await app.request(`/logs?user_id=${ownerId}`, { method: 'GET' });
      expect(response.status).toBe(200);

      const payload = await response.json();
      expect(payload.items.length).toBeGreaterThan(0);
      payload.items.forEach((log: any) => {
        expect(log.author.id).toBe(ownerId);
        expect(log.is_public).toBe(true);
      });
    });

    it('enforces pagination bounds', async () => {
      await seedTestLogs();

      const response = await app.request('/logs?limit=0', { method: 'GET' });
      expect(response.status).toBe(400);

      const maxResponse = await app.request('/logs?limit=101', { method: 'GET' });
      expect(maxResponse.status).toBe(400);
    });
  });

  describe('POST /logs', () => {
    it('creates a new log for the authenticated user', async () => {
      const userId = 'user_writer';
      await createTestUser(userId, 'writer');
      await seedTestTags();
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'New adventure',
          content_md: '# Log\nTesting contract expectations',
          tag_ids: ['tag_anime', 'tag_manga'],
          is_public: true
        })
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const log = await response.json();
      expect(log).toMatchObject({
        title: 'New adventure',
        content_md: '# Log\nTesting contract expectations',
        is_public: true,
        author: {
          id: userId,
          twitter_username: 'writer'
        }
      });
      expect(typeof log.id).toBe('string');
      expect(typeof log.created_at).toBe('string');
      expect(Array.isArray(log.tags)).toBe(true);
      expect(log.tags.map((tag: any) => tag.id)).toEqual(expect.arrayContaining(['tag_anime', 'tag_manga']));
    });

    it('creates a new log using tag_names and auto-creates missing tags', async () => {
      const userId = 'user_writer_tags';
      await createTestUser(userId, 'writer_tags');
      await seedTestTags(); // This creates 'Anime', 'Attack on Titan', 'Manga' tags
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Adventure with tag names',
          content_md: '# Log\nTesting tag_names functionality',
          is_public: true,
          tag_names: ['Anime', 'New Auto-Created Tag', 'Another New Tag'] // Mix of existing and new tags
        })
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const log = await response.json();
      expect(log).toMatchObject({
        title: 'Adventure with tag names',
        content_md: '# Log\nTesting tag_names functionality',
        is_public: true,
        author: {
          id: userId,
          twitter_username: 'writer_tags'
        }
      });
      expect(typeof log.id).toBe('string');
      expect(typeof log.created_at).toBe('string');
      expect(Array.isArray(log.tags)).toBe(true);
      expect(log.tags).toHaveLength(3);
      
      // Check that we have the existing 'Anime' tag and the two new auto-created tags
      const tagNames = log.tags.map((tag: any) => tag.name).sort();
      expect(tagNames).toEqual(['Anime', 'Another New Tag', 'New Auto-Created Tag']);
      
      // Check that new tags have empty description and metadata
      const newTags = log.tags.filter((tag: any) => tag.name !== 'Anime');
      newTags.forEach((tag: any) => {
        expect(tag.description).toBe('');
        expect(tag.metadata).toEqual({});
        expect(tag.created_by).toBe(userId);
      });
    });

    it('returns 400 when payload is invalid', async () => {
      const userId = 'user_writer';
      await createTestUser(userId, 'writer');
      await seedTestTags();
      const sessionToken = await createTestSession(userId);

      const missingTags = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Missing tags',
          content_md: 'No tags here'
        })
      });
      expect(missingTags.status).toBe(400);

      const missingContent = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          tag_ids: ['tag_anime']
        })
      });
      expect(missingContent.status).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      const response = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'No auth',
          content_md: 'Should fail',
          tag_ids: ['tag_anime']
        })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /logs/:logId', () => {
    it('returns public log detail for any visitor', async () => {
      const { publicLogId } = await seedTestLogs();

      const response = await app.request(`/logs/${publicLogId}`, { method: 'GET' });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const log = await response.json();
      expect(log).toMatchObject({
        id: publicLogId,
        is_public: true,
        author: {
          id: expect.any(String)
        }
      });
      expect(Array.isArray(log.tags)).toBe(true);
    });

    it('allows owners to see private logs', async () => {
      const { privateLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);

      const response = await app.request(`/logs/${privateLogId}`, {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(200);
      const log = await response.json();
      expect(log.is_public).toBe(false);
      expect(log.author.id).toBe(ownerId);
    });

    it('returns 403 for private log when not owner', async () => {
      const { privateLogId, otherUserId } = await seedTestLogs();
      const sessionToken = await createTestSession(otherUserId);

      const response = await app.request(`/logs/${privateLogId}`, {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(403);
    });

    it('returns 403 for private log when unauthenticated', async () => {
      const { privateLogId } = await seedTestLogs();

      const response = await app.request(`/logs/${privateLogId}`, { method: 'GET' });
      expect(response.status).toBe(403);
    });

    it('returns 404 for missing log', async () => {
      const response = await app.request('/logs/log_does_not_exist', { method: 'GET' });
      expect(response.status).toBe(404);
    });

    it('returns 400 when log id format is invalid', async () => {
      const response = await app.request('/logs/not-a-ulid!', { method: 'GET' });
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /logs/:logId', () => {
    it('updates log content and visibility for owner', async () => {
      const { publicLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);

      const response = await app.request(`/logs/${publicLogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Updated title',
          content_md: 'Updated content',
          is_public: false,
          tag_ids: ['tag_manga']
        })
      });

      expect(response.status).toBe(200);
      const log = await response.json();
      expect(log).toMatchObject({
        id: publicLogId,
        title: 'Updated title',
        content_md: 'Updated content',
        is_public: false
      });
      expect(log.tags.map((tag: any) => tag.id)).toEqual(['tag_manga']);
    });

    it('returns 401 when unauthenticated', async () => {
      const { publicLogId } = await seedTestLogs();

      const response = await app.request(`/logs/${publicLogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_md: 'No session'
        })
      });

      expect(response.status).toBe(401);
    });

    it('returns 403 when requester does not own the log', async () => {
      const { publicLogId, otherUserId } = await seedTestLogs();
      const sessionToken = await createTestSession(otherUserId);

      const response = await app.request(`/logs/${publicLogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          content_md: 'Unauthorized update'
        })
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 when log does not exist', async () => {
      const userId = 'user_writer';
      await createTestUser(userId, 'writer');
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/logs/log_missing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          content_md: 'Missing log'
        })
      });

      expect(response.status).toBe(404);
    });

    it('returns 400 when payload is invalid', async () => {
      const { publicLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);

      const response = await app.request(`/logs/${publicLogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Bad payload'
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /logs/:logId', () => {
    it('deletes a log owned by the requester', async () => {
      const { publicLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);

      const response = await app.request(`/logs/${publicLogId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(204);

      const confirm = await app.request(`/logs/${publicLogId}`, {
        method: 'GET',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });
      expect(confirm.status).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
      const { publicLogId } = await seedTestLogs();

      const response = await app.request(`/logs/${publicLogId}`, { method: 'DELETE' });
      expect(response.status).toBe(401);
    });

    it('returns 403 when user does not own the log', async () => {
      const { publicLogId, otherUserId } = await seedTestLogs();
      const sessionToken = await createTestSession(otherUserId);

      const response = await app.request(`/logs/${publicLogId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 for missing log', async () => {
      const userId = 'user_writer';
      await createTestUser(userId, 'writer');
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/logs/log_missing', {
        method: 'DELETE',
        headers: {
          Cookie: `session=${sessionToken}`
        }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /logs/:logId/share', () => {
    it('shares a public log for the owner', async () => {
      const { publicLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);

      const response = await app.request(`/logs/${publicLogId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          message: 'Check out my new log!'
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        twitter_post_id: expect.any(String)
      });
    });

    it('returns 401 when unauthenticated', async () => {
      const { publicLogId } = await seedTestLogs();

      const response = await app.request(`/logs/${publicLogId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Should fail'
        })
      });

      expect(response.status).toBe(401);
    });

    it('returns 403 when user is not the owner', async () => {
      const { publicLogId, otherUserId } = await seedTestLogs();
      const sessionToken = await createTestSession(otherUserId);

      const response = await app.request(`/logs/${publicLogId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          message: 'Unauthorized share'
        })
      });

      expect(response.status).toBe(403);
    });

    it('returns 400 when log is private', async () => {
      const { privateLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);

      const response = await app.request(`/logs/${privateLogId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          message: 'Should not be shareable'
        })
      });

      expect(response.status).toBe(400);
    });

    it('returns 404 when log does not exist', async () => {
      const userId = 'user_writer';
      await createTestUser(userId, 'writer');
      const sessionToken = await createTestSession(userId);

      const response = await app.request('/logs/log_missing/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          message: 'Missing log'
        })
      });

      expect(response.status).toBe(404);
    });

    it('surfaces upstream Twitter failures as 502', async () => {
      const { publicLogId, ownerId } = await seedTestLogs();
      const sessionToken = await createTestSession(ownerId);

      const response = await app.request(`/logs/${publicLogId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          simulate_failure: true
        })
      });

      expect(response.status).toBe(502);
    });
  });
});
