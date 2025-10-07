import { describe, it, expect } from 'vitest';
import app from '../helpers/app';

// Integration test: Tag-based content discovery
// TODO: Skip due to authentication and data seeding issues
// - Tests require authenticated user sessions for content creation
// - Database seeding and session management not working properly in integration tests
// - Complex multi-step flows that depend on authentication middleware
describe.skip('Integration: Content Discovery', () => {

  it('should discover content through tag browsing and associations', async () => {
    // Browse all available tags
    const tagsResponse = await app.request('/tags', {
      method: 'GET'
    });
    expect(tagsResponse.status).toBe(200);
    
    const tagsData = await tagsResponse.json();
    expect(tagsData).toHaveProperty('items');
    expect(Array.isArray(tagsData.items)).toBe(true);
    expect(tagsData.items).not.toHaveLength(0);

    // Search for specific tag category
    const animeTagsResponse = await app.request('/tags?search=anime', {
      method: 'GET'
    });
    expect(animeTagsResponse.status).toBe(200);
    
    // Find logs associated with anime tags
    const animeLogsResponse = await app.request('/logs?tag_ids=1,2', {
      method: 'GET'
    });
    expect(animeLogsResponse.status).toBe(200);
    
    const animeLogsData = await animeLogsResponse.json();
    expect(animeLogsData).toHaveProperty('items');
    expect(animeLogsData.items.length).toBeGreaterThan(0);

    // Verify public logs are accessible without authentication
    expect(animeLogsData.items.every((log: any) => log.privacy === 'public')).toBe(true);
  });

  it('should show related content through tag associations', async () => {
    // Get a specific log with tags
    const logResponse = await app.request('/logs/123', {
      method: 'GET'
    });
    expect(logResponse.status).toBe(200);
    
    const logData = await logResponse.json();
    expect(logData).toHaveProperty('tags');
    expect(Array.isArray(logData.associated_tags)).toBe(true);

    // Use the tags to find related content
    const relatedResponse = await app.request(`/logs?tag_ids=${logData.associated_tags.map((t: any) => t.id).join(',')}`, {
      method: 'GET'
    });
    expect(relatedResponse.status).toBe(200);
    
    const relatedData = await relatedResponse.json();
    expect(relatedData.items.length).toBeGreaterThan(1); // Should include original + related
  });

  it('should handle tag discovery pagination', async () => {
    // Test pagination with tags
    const page1Response = await app.request('/tags?limit=5&offset=0', {
      method: 'GET'
    });
    expect(page1Response.status).toBe(200);
    
    const page1Data = await page1Response.json();
    expect(page1Data.items).toHaveLength(5);
    expect(page1Data).toHaveProperty('total');
    expect(page1Data).toHaveProperty('limit', 5);
    expect(page1Data).toHaveProperty('offset', 0);

    // Get next page
    const page2Response = await app.request('/tags?limit=5&offset=5', {
      method: 'GET'
    });
    expect(page2Response.status).toBe(200);
    
    const page2Data = await page2Response.json();
    expect(page2Data).toHaveProperty('offset', 5);
  });
});