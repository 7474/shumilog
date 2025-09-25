import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

// Integration test: Dynamic tag creation and management
describe('Integration: Tag Management', () => {
  const app = new Hono();

  it('should create and associate new tags during log creation', async () => {
    const sessionCookie = 'session=test_session_token';

    // Create log with new tags that don't exist yet
    const logWithNewTagsData = {
      title: 'Demon Slayer Movie Review',
      content: 'Incredible animation and emotional story!',
      tag_ids: [], // No existing tags
      new_tags: ['demon-slayer', 'movie', 'ufotable'], // These should be created
      privacy: 'public',
      rating: 5
    };

    const logResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(logWithNewTagsData)
    });
    expect(logResponse.status).toBe(201);

    const logData = await logResponse.json();
    expect(logData).toHaveProperty('tag_ids');
    expect(logData.tag_ids.length).toBe(3); // Should have 3 new tag IDs

    // Verify new tags were created and are discoverable
    const newTagsResponse = await app.request('/tags?search=demon-slayer', {
      method: 'GET'
    });
    expect(newTagsResponse.status).toBe(200);
    
    const tagSearchData = await newTagsResponse.json();
    expect(tagSearchData.items.length).toBeGreaterThan(0);
    expect(tagSearchData.items[0]).toHaveProperty('name', 'demon-slayer');
  });

  it('should handle tag hierarchies and associations', async () => {
    const sessionCookie = 'session=test_session_token';

    // Create parent-child tag relationships
    const animeLogData = {
      title: 'One Piece Episode Review',
      content: 'Great episode in the Wano arc!',
      tag_ids: [1], // anime (parent)
      new_tags: ['one-piece', 'wano-arc', 'episode-1000'], // children
      privacy: 'public'
    };

    const logResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(animeLogData)
    });
    expect(logResponse.status).toBe(201);

    // Query for related tags
    const relatedTagsResponse = await app.request('/tags?related_to=1', { // anime tag
      method: 'GET'
    });
    expect(relatedTagsResponse.status).toBe(200);
    
    const relatedData = await relatedTagsResponse.json();
    expect(relatedData.items.length).toBeGreaterThan(0);
  });

  it('should prevent duplicate tag creation', async () => {
    const sessionCookie = 'session=test_session_token';

    // First log creates the tag
    const firstLogData = {
      title: 'First Attack on Titan Review',
      content: 'Amazing series!',
      new_tags: ['attack-on-titan'],
      privacy: 'public'
    };

    await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(firstLogData)
    });

    // Second log should reuse existing tag
    const secondLogData = {
      title: 'Second Attack on Titan Review',
      content: 'Still love this series!',
      new_tags: ['attack-on-titan'], // Should reuse existing
      privacy: 'public'
    };

    const secondResponse = await app.request('/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(secondLogData)
    });
    expect(secondResponse.status).toBe(201);

    // Verify only one "attack-on-titan" tag exists
    const tagSearchResponse = await app.request('/tags?search=attack-on-titan', {
      method: 'GET'
    });
    expect(tagSearchResponse.status).toBe(200);
    
    const searchData = await tagSearchResponse.json();
    const attackOnTitanTags = searchData.items.filter(
      (tag: any) => tag.name === 'attack-on-titan'
    );
    expect(attackOnTitanTags).toHaveLength(1);
  });

  it('should handle tag renaming and merging', async () => {
    const sessionCookie = 'session=admin_session_token';

    // Update tag name (admin operation)
    const updateTagResponse = await app.request('/tags/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: 'attack-on-titan-updated',
        description: 'Updated tag name for consistency'
      })
    });
    expect(updateTagResponse.status).toBe(200);

    // Verify logs still associated with renamed tag
    const logsWithUpdatedTagResponse = await app.request('/logs?tag_ids=123', {
      method: 'GET'
    });
    expect(logsWithUpdatedTagResponse.status).toBe(200);
    
    const updatedTagLogsData = await logsWithUpdatedTagResponse.json();
    expect(updatedTagLogsData.items.length).toBeGreaterThan(0);
  });
});