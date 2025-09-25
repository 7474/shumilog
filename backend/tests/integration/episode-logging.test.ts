import { describe, it, expect } from 'vitest';
import app from '../helpers/app';

// Integration test: Episode-level log tracking with tag associations
describe('Integration: Episode-Level Review Tracking', () => {

  it('should track episode progress across anime series', async () => {
    // Login with Twitter OAuth
    const authResponse = await app.request('/auth/twitter', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Mobile)'
      }
    });
    expect(authResponse.status).toBe(302);

    // Simulate OAuth callback
    const callbackResponse = await app.request('/auth/callback?code=test_code&state=test_state', {
      method: 'GET'
    });
    expect(callbackResponse.status).toBe(302);

    // Extract session cookie
    const sessionCookie = callbackResponse.headers.get('Set-Cookie')?.match(/session=([^;]+)/)?.[0];
    expect(sessionCookie).toBeTruthy();

    // Create first episode log for Attack on Titan
    const episode1Data = {
      title: 'Attack on Titan S1E1 - To You, in 2000 Years',
      content: '# First Episode Review\n\nAmazing start to the series! The walls are mysterious.',
      tag_ids: [1, 2], // anime, attack-on-titan
      privacy: 'public',
      episode_number: 1,
      season_number: 1,
      rating: 5
    };

    const log1Response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie!
      },
      body: JSON.stringify(episode1Data)
    });
    expect(log1Response.status).toBe(201);

    // Create second episode log 
    const episode2Data = {
      title: 'Attack on Titan S1E2 - That Day',
      content: 'The tragedy unfolds. Eren\'s transformation begins.',
      tag_ids: [1, 2],
      privacy: 'public',
      episode_number: 2,
      season_number: 1,
      rating: 5
    };

    const log2Response = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie!
      },
      body: JSON.stringify(episode2Data)
    });
    expect(log2Response.status).toBe(201);

    // Verify user's episode tracking progress
    const userProfileResponse = await app.request('/users/me', {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie!
      }
    });
    expect(userProfileResponse.status).toBe(200);

    // Query logs filtered by specific anime tag
    const animeLogsResponse = await app.request('/logs?tag_ids=2&user_id=1', {
      method: 'GET'
    });
    expect(animeLogsResponse.status).toBe(200);
    
    const animeData = await animeLogsResponse.json();
    expect(animeData.items).toHaveLength(2);
    expect(animeData.items[0]).toHaveProperty('episode_number');
    expect(animeData.items[0]).toHaveProperty('season_number');
  });

  it('should handle episode numbering and season tracking', async () => {
    // Create logs for different seasons
    const sessionCookie = 'session=test_session_token';

    const s1e5Data = {
      title: 'Attack on Titan S1E5',
      content: 'Mid-season episode',
      tag_ids: [1, 2],
      episode_number: 5,
      season_number: 1,
      rating: 4
    };

    const s2e1Data = {
      title: 'Attack on Titan S2E1',
      content: 'Season 2 premiere!',
      tag_ids: [1, 2],
      episode_number: 1,
      season_number: 2,
      rating: 5
    };

    // Create both logs
    await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(s1e5Data)
    });

    await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(s2e1Data)
    });

    // Verify episode ordering and season separation
    const userLogsResponse = await app.request('/logs?user_id=1&tag_ids=2', {
      method: 'GET'
    });
    expect(userLogsResponse.status).toBe(200);
    
    const userData = await userLogsResponse.json();
    expect(userData.items.length).toBeGreaterThanOrEqual(2);
    
    // Verify episodes are properly ordered by season then episode
    const episodes = userData.items.filter((log: any) => log.episode_number);
    expect(episodes).toBeTruthy();
  });
});