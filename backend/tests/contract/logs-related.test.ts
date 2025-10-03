import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  createTestUser,
  createTestSession,
  seedTestLogs
} from '../helpers/app';

/**
 * Contract Test: GET /logs/{logId}/related
 *
 * Tests the related logs endpoint that returns logs sharing tags with the target log.
 */
describe('Contract: GET /logs/{logId}/related', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  it('returns related logs based on shared tags', async () => {
    await seedTestLogs();

    // Get a log that has tags
    const logsResponse = await app.request('/logs', { method: 'GET' });
    expect(logsResponse.status).toBe(200);
    
    const logsData = await logsResponse.json();
    const targetLog = logsData.items.find((log: any) => log.tags && log.tags.length > 0);
    expect(targetLog).toBeDefined();

    // Get related logs
    const response = await app.request(`/logs/${targetLog.id}/related`, {
      method: 'GET'
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');

    const payload = await response.json();
    expect(payload).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number)
    });

    // Related logs should not include the target log itself
    const relatedLogIds = payload.items.map((log: any) => log.id);
    expect(relatedLogIds).not.toContain(targetLog.id);

    // All related logs should be public
    payload.items.forEach((log: any) => {
      expect(log.is_public).toBe(true);
      expect(log).toMatchObject({
        id: expect.any(String),
        content_md: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        author: expect.any(Object),
        tags: expect.any(Array)
      });
    });
  });

  it('returns empty array when log has no tags', async () => {
    await createTestUser('user_no_tags', 'No Tags User');
    const sessionToken = await createTestSession('user_no_tags');
    
    // Create a log without tags
    const logResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Log without tags',
        content_md: '# No tags here',
        is_public: true
      })
    });

    expect(logResponse.status).toBe(201);
    const logData = await logResponse.json();

    // Get related logs
    const response = await app.request(`/logs/${logData.id}/related`, {
      method: 'GET'
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.items).toEqual([]);
    expect(payload.total).toBe(0);
  });

  it('returns 404 when log does not exist', async () => {
    const response = await app.request('/logs/nonexistent_log_id/related', {
      method: 'GET'
    });

    expect(response.status).toBe(404);
  });

  it('respects limit parameter', async () => {
    await seedTestLogs();

    const logsResponse = await app.request('/logs', { method: 'GET' });
    const logsData = await logsResponse.json();
    const targetLog = logsData.items.find((log: any) => log.tags && log.tags.length > 0);

    const response = await app.request(`/logs/${targetLog.id}/related?limit=2`, {
      method: 'GET'
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.items.length).toBeLessThanOrEqual(2);
  });

  it('validates limit parameter bounds', async () => {
    await seedTestLogs();

    const logsResponse = await app.request('/logs', { method: 'GET' });
    const logsData = await logsResponse.json();
    const targetLog = logsData.items[0];

    // Test limit too large
    const tooLargeResponse = await app.request(`/logs/${targetLog.id}/related?limit=21`, {
      method: 'GET'
    });
    expect(tooLargeResponse.status).toBe(400);

    // Test limit too small
    const tooSmallResponse = await app.request(`/logs/${targetLog.id}/related?limit=0`, {
      method: 'GET'
    });
    expect(tooSmallResponse.status).toBe(400);
  });

  it('does not return private logs as related', async () => {
    await createTestUser('user_private', 'Private User');
    const sessionToken = await createTestSession('user_private');
    
    // Create a public log with tags
    const publicLogResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Public log',
        content_md: '# Public #TestTag',
        is_public: true
      })
    });
    expect(publicLogResponse.status).toBe(201);
    const publicLog = await publicLogResponse.json();

    // Create a private log with same tags
    const privateLogResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Private log',
        content_md: '# Private #TestTag',
        is_public: false
      })
    });
    expect(privateLogResponse.status).toBe(201);
    const privateLog = await privateLogResponse.json();

    // Get related logs for public log
    const response = await app.request(`/logs/${publicLog.id}/related`, {
      method: 'GET'
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    
    // Private log should not be in related logs
    const relatedLogIds = payload.items.map((log: any) => log.id);
    expect(relatedLogIds).not.toContain(privateLog.id);
  });
});
