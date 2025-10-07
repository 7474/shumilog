import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  createTestSession,
  createTestUser,
  seedTestTags
} from '../helpers/app';

const TEST_USER_ID = 'user_share_flow_author';
const TEST_USERNAME = 'share_flow_author';

/**
 * Integration: Log share flow
 *
 * This suite walks through the end-to-end happy path for a user authoring a log,
 * associating it with tags, and sharing it to Twitter. The current Worker
 * implementation still returns mocked responses, so these expectations fail.
 */
describe('Integration: Log share flow', () => {
  beforeEach(async () => {
    await clearTestData();
    await seedTestTags();
    await createTestUser(TEST_USER_ID, TEST_USERNAME);
  });

  afterEach(async () => {
    await clearTestData();
  });

  it('allows an authenticated author to create, tag, and share a log', async () => {
    const sessionToken = await createTestSession(TEST_USER_ID);
    const cookieHeader = `session=${sessionToken}`;

    // Step 1: author creates a new public log with tag associations
    const createResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        title: 'Integration share flow',
        content_md: '# Sharing time\nIntegration flow expectations',
        is_public: true,
        tag_ids: ['tag_anime', 'tag_manga']
      })
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get('Content-Type')).toContain('application/json');

    const createdLog = await createResponse.json();
    expect(createdLog).toMatchObject({
      title: 'Integration share flow',
      is_public: true,
      user: {
        id: TEST_USER_ID,
        twitter_username: TEST_USERNAME
      }
    });
    expect(Array.isArray(createdLog.associated_tags)).toBe(true);
    expect(createdLog.associated_tags.map((tag: any) => tag.id)).toEqual(
      expect.arrayContaining(['tag_anime', 'tag_manga'])
    );

    const logId = createdLog.id;
    expect(typeof logId).toBe('string');

    // Step 2: fetch log detail to confirm persistence and association metadata
    const detailResponse = await app.request(`/logs/${logId}`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader
      }
    });
    expect(detailResponse.status).toBe(200);

    const detailPayload = await detailResponse.json();
    expect(detailPayload).toMatchObject({
      id: logId,
      is_public: true,
      user: {
        id: TEST_USER_ID
      }
    });
    expect(Array.isArray(detailPayload.associated_tags)).toBe(true);
    expect(detailPayload.associated_tags.map((tag: any) => tag.id)).toEqual(
      expect.arrayContaining(['tag_anime', 'tag_manga'])
    );

    // Step 3: log appears in user filter results with tag filter applied
    const listResponse = await app.request(`/logs?user_id=${TEST_USER_ID}&tag_ids=tag_anime`, {
      method: 'GET'
    });
    expect(listResponse.status).toBe(200);

    const listPayload = await listResponse.json();
    expect(Array.isArray(listPayload.items)).toBe(true);
    expect(listPayload.items.some((log: any) => log.id === logId)).toBe(true);

    // Step 4: author shares the log to Twitter with a custom message
    const shareResponse = await app.request(`/logs/${logId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        message: 'Sharing my latest log!'
      })
    });

    expect(shareResponse.status).toBe(200);
    const sharePayload = await shareResponse.json();
    expect(sharePayload).toMatchObject({
      twitter_post_id: expect.any(String)
    });
    expect(typeof sharePayload.twitter_post_id).toBe('string');
  });
});
