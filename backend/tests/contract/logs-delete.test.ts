import { describe, it, expect } from 'vitest';
import { app } from "../helpers/app";

// Contract tests for DELETE /logs/{logId} endpoint
describe('Contract: DELETE /logs/{logId}', () => {

  it('should delete log for authenticated owner', async () => {
    const response = await app.request('/logs/123', {
      method: 'DELETE',
      headers: {
        'Cookie': 'session=owner_session_token'
      }
    });

    expect(response.status).toBe(204);
  });

  it('should return 401 for unauthenticated request', async () => {
    const response = await app.request('/logs/123', {
      method: 'DELETE'
    });

    expect(response.status).toBe(401);
  });

  it('should return 403 for non-owner trying to delete', async () => {
    const response = await app.request('/logs/123', {
      method: 'DELETE', 
      headers: {
        'Cookie': 'session=other_user_session_token'
      }
    });

    expect(response.status).toBe(403);
  });

  it('should return 404 for non-existent log', async () => {
    const response = await app.request('/logs/999999', {
      method: 'DELETE',
      headers: {
        'Cookie': 'session=valid_session_token'
      }
    });

    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid log ID format', async () => {
    const response = await app.request('/logs/invalid-id', {
      method: 'DELETE',
      headers: {
        'Cookie': 'session=valid_session_token'
      }
    });

    expect(response.status).toBe(400);
  });
});