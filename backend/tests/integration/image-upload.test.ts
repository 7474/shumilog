import { describe, it, expect, beforeEach } from 'vitest';
import app, { createTestSession, clearTestData, getTestD1Database } from '../helpers/app.js';

describe('Image Upload API', () => {
  let sessionToken: string;
  let userId: string;
  let logId: string;

  beforeEach(async () => {
    await clearTestData();
    
    // Create test user and session
    userId = 'image_test_user';
    sessionToken = await createTestSession(userId);

    // Create test log directly in database
    const db = getTestD1Database();
    const now = new Date().toISOString();
    logId = 'test_log_for_images';
    
    await db.prepare(
      `INSERT INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(logId, userId, 'Test Log for Images', '# Test Content', 1, now, now).run();
  });

  it('should accept POST requests to /api/logs/:logId/images', async () => {
    // Create a simple test file
    const fileContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const file = new File([fileContent], 'test.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('display_order', '0');

    const response = await app.request(`/api/logs/${logId}/images`, {
      method: 'POST',
      headers: {
        Cookie: `session=${sessionToken}`,
      },
      body: formData,
    });

    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);

    if (response.status !== 201) {
      const body = await response.text();
      console.log('Response body:', body);
    }

    // We expect either 201 (success) or 500 (R2 not configured), but NOT 405
    expect(response.status).not.toBe(405);
  });

  it('should handle GET requests to /api/logs/:logId/images', async () => {
    const response = await app.request(`/api/logs/${logId}/images`, {
      method: 'GET',
    });

    console.log('GET Response status:', response.status);
    
    // Should return 200 with empty images list
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });
});
