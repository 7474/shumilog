import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app, clearTestData, setupTestEnvironment, seedTestLogs } from '../helpers/app';
import { validateAppRequest } from '../helpers/openapi-auto-validator';

/**
 * Automatic OpenAPI Validation Demo
 * 
 * This test demonstrates automatic validation without individual endpoint implementations.
 * The validateAppRequest wrapper automatically validates ALL responses against the OpenAPI spec.
 * 
 * Key principle: Tests focus on business logic, validation happens automatically.
 */
describe('Automatic OpenAPI Validation - Demo', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Public endpoints - automatic validation', () => {
    it('validates all public endpoint responses automatically', async () => {
      await seedTestLogs();
      
      // Each request is automatically validated against OpenAPI spec
      // No need to call toSatisfyApiSpec() manually
      
      const health = await validateAppRequest(app, '/health', { method: 'GET' });
      expect(health.status).toBe(200);
      
      const logs = await validateAppRequest(app, '/logs', { method: 'GET' });
      expect(logs.status).toBe(200);
      
      const tags = await validateAppRequest(app, '/tags', { method: 'GET' });
      expect(tags.status).toBe(200);
    });
  });

  describe('Authenticated endpoints - automatic validation', () => {
    it('validates authenticated endpoint responses automatically', async () => {
      const sessionToken = await setupTestEnvironment();
      
      // All authenticated requests are also automatically validated
      const userMe = await validateAppRequest(app, '/users/me', {
        method: 'GET',
        headers: { Cookie: `session=${sessionToken}` }
      });
      expect(userMe.status).toBe(200);
      
      const userLogs = await validateAppRequest(app, '/users/me/logs', {
        method: 'GET',
        headers: { Cookie: `session=${sessionToken}` }
      });
      expect(userLogs.status).toBe(200);
      
      const userStats = await validateAppRequest(app, '/users/me/stats', {
        method: 'GET',
        headers: { Cookie: `session=${sessionToken}` }
      });
      expect(userStats.status).toBe(200);
    });
  });

  describe('CRUD operations - automatic validation', () => {
    it('validates POST, PUT operations automatically', async () => {
      const sessionToken = await setupTestEnvironment();
      
      // Create a log - automatically validated
      const createLog = await validateAppRequest(app, '/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Auto-validated Log',
          content_md: '# Content',
          is_public: true
        })
      });
      expect(createLog.status).toBe(201);
      
      const logData = await createLog.json();
      
      // Update the log - automatically validated
      const updateLog = await validateAppRequest(app, `/logs/${logData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session=${sessionToken}`
        },
        body: JSON.stringify({
          title: 'Updated Title',
          content_md: '# Updated',
          is_public: true
        })
      });
      expect(updateLog.status).toBe(200);
    });
  });
});
