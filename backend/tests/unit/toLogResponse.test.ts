import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app, clearTestData, seedTestLogs } from '../helpers/app';

/**
 * Unit test to verify toLogResponse includes the images field
 */
describe('toLogResponse images field', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  it('should include images array in log response', async () => {
    await seedTestLogs();

    const response = await app.request('/logs', { method: 'GET' });
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.items.length).toBeGreaterThan(0);

    // Verify all logs have the images field
    payload.items.forEach((log: any) => {
      expect(log).toHaveProperty('images');
      expect(Array.isArray(log.images)).toBe(true);
    });
  });

  it('should include images array in single log detail response', async () => {
    const { publicLogId } = await seedTestLogs();

    const response = await app.request(`/logs/${publicLogId}`, { method: 'GET' });
    expect(response.status).toBe(200);

    const log = await response.json();
    expect(log).toHaveProperty('images');
    expect(Array.isArray(log.images)).toBe(true);
  });
});
