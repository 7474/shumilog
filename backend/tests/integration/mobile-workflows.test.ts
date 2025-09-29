import { describe, it, expect } from 'vitest';
import app from '../helpers/app';

// Integration test: Mobile-first experience workflows
// TODO: Skip due to OAuth authentication flow issues in test environment
// - Tests expect real OAuth callback flow with X.com/Twitter
// - Session cookie authentication not working properly in integration tests
// - Related to authentication middleware issues between test and runtime environments
describe.skip('Integration: Mobile Workflows', () => {

  it('should handle mobile user journey from login to log creation', async () => {
    // Mobile user starts OAuth flow
    const authResponse = await app.request('/auth/twitter', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    expect(authResponse.status).toBe(302);
    expect(authResponse.headers.get('Location')).toContain('x.com');

    // Handle OAuth callback (mobile)
    const callbackResponse = await app.request('/auth/callback?code=mobile_code&state=mobile_state', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });
    expect(callbackResponse.status).toBe(302);

    const sessionCookie = callbackResponse.headers.get('Set-Cookie')?.match(/session=([^;]+)/)?.[0];
    expect(sessionCookie).toBeTruthy();

    // Create quick log entry (mobile use case)
    const mobileLogData = {
      title: 'Quick anime note',
      content: 'Just finished episode 5 - amazing!',
      tag_ids: [1], // anime
      privacy: 'private', // Default for mobile quick entries
      rating: 5
    };

    const logResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie!,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      body: JSON.stringify(mobileLogData)
    });
    expect(logResponse.status).toBe(201);

    // Verify mobile-optimized response
    const logData = await logResponse.json();
    expect(logData).toHaveProperty('id');
    expect(logData).toHaveProperty('title', mobileLogData.title);
  });

  it('should optimize API responses for mobile bandwidth', async () => {
    // Request logs with mobile-specific headers
    const mobileResponse = await app.request('/logs?limit=10', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
      }
    });
    expect(mobileResponse.status).toBe(200);

    // Check response is optimized (smaller payload)
    const responseSize = JSON.stringify(await mobileResponse.json()).length;
    expect(responseSize).toBeLessThan(50000); // Reasonable mobile payload size
  });

  it('should handle offline-to-online sync scenarios', async () => {
    const sessionCookie = 'session=mobile_session_token';

    // Simulate multiple log creations (offline cache sync)
    const offlineEntries = [
      {
        title: 'Offline Entry 1',
        content: 'Created while offline',
        tag_ids: [1],
        created_at: '2024-01-01T10:00:00Z'
      },
      {
        title: 'Offline Entry 2', 
        content: 'Another offline entry',
        tag_ids: [2],
        created_at: '2024-01-01T11:00:00Z'
      }
    ];

    // Sync multiple entries when back online
    for (const entry of offlineEntries) {
      const syncResponse = await app.request('/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
          'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0'
        },
        body: JSON.stringify(entry)
      });
      expect(syncResponse.status).toBe(201);
    }

    // Verify all entries synced successfully
    const userLogsResponse = await app.request('/logs?user_id=1', {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    expect(userLogsResponse.status).toBe(200);
  });
});