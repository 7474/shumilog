import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  app,
  clearTestData,
  setupTestEnvironment
} from '../helpers/app';

describe('Log Hashtag Processing Integration', () => {
  let sessionToken: string;
  
  beforeEach(async () => {
    sessionToken = await setupTestEnvironment();
  });
  
  afterEach(async () => {
    await clearTestData();
  });
  
  it('should extract hashtags from log content and create tag associations on log creation', async () => {
    const response = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'My Anime Review',
        content_md: 'Just watched an amazing #{anime} series! It was really #{exciting} and had great #{action scenes}.',
        is_public: true
      })
    });
    
    expect(response.status).toBe(201);
    const createdLog = await response.json();
    expect(createdLog.title).toBe('My Anime Review');
    
    // Check that hashtags were extracted and associated with the log
    expect(createdLog.associated_tags).toBeDefined();
    expect(createdLog.associated_tags).toHaveLength(3);
    const tagNames = createdLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['action scenes', 'anime', 'exciting']);
    
    // Verify that the tags were created with empty descriptions
    createdLog.associated_tags.forEach((tag: any) => {
      expect(tag.description).toBe('');
      expect(tag.metadata).toEqual({});
    });
  });
  
  it('should merge explicit tag names with extracted hashtags', async () => {
    const response = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Gaming Session',
        content_md: 'Had a great #gaming session today with #{Final Fantasy}!',
        tag_names: ['rpg', 'weekend'],
        is_public: true
      })
    });
    
    expect(response.status).toBe(201);
    const createdLog = await response.json();
    
    // Should have both explicit tags and extracted hashtags
    expect(createdLog.associated_tags).toHaveLength(4);
    const tagNames = createdLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['Final Fantasy', 'gaming', 'rpg', 'weekend']);
  });
  
  it('should link to existing tags when hashtags match existing tag names', async () => {
    // Create an existing tag first
    const tagResponse = await app.request('/api/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'existingTag',
        description: 'Pre-existing tag with description'
      })
    });
    
    expect(tagResponse.status).toBe(201);
    const existingTag = await tagResponse.json();
    
    // Create log with hashtag referencing the existing tag
    const logResponse = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Test Log',
        content_md: 'This log references #{existingTag} and #{newTag}',
        is_public: true
      })
    });
    
    expect(logResponse.status).toBe(201);
    const createdLog = await logResponse.json();
    
    expect(createdLog.associated_tags).toHaveLength(2);
    const tagNames = createdLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['existingTag', 'newTag']);
    
    // Verify the existing tag was linked (not recreated)
    const linkedExistingTag = createdLog.associated_tags.find((t: any) => t.name === 'existingTag');
    expect(linkedExistingTag.id).toBe(existingTag.id);
    expect(linkedExistingTag.description).toBe('Pre-existing tag with description');
    
    // Verify the new tag was created with empty description
    const newTag = createdLog.associated_tags.find((t: any) => t.name === 'newTag');
    expect(newTag.description).toBe('');
  });
  
  it('should handle Japanese characters in hashtags', async () => {
    const response = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Japanese Content',
        content_md: '今日は#{アニメ}を見ました。とても#{面白い}でした！#ゲーム も楽しかった。',
        is_public: true
      })
    });
    
    expect(response.status).toBe(201);
    const createdLog = await response.json();
    
    expect(createdLog.associated_tags).toHaveLength(3);
    const tagNames = createdLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['アニメ', 'ゲーム', '面白い']);
  });
  
  it('should extract hashtags when updating log content', async () => {
    // Create initial log
    const createResponse = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Initial Log',
        content_md: 'Initial content with #initial tag',
        is_public: true
      })
    });
    
    const createdLog = await createResponse.json();
    expect(createdLog.associated_tags).toHaveLength(1);
    expect(createdLog.associated_tags[0].name).toBe('initial');
    
    // Update with new content containing different hashtags
    const updateResponse = await app.request(`/api/logs/${createdLog.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        content_md: 'Updated content with #{new tag} and #updated hashtags'
      })
    });
    
    expect(updateResponse.status).toBe(200);
    const updatedLog = await updateResponse.json();
    
    // Should have new hashtags extracted from updated content
    expect(updatedLog.associated_tags).toHaveLength(2);
    const tagNames = updatedLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['new tag', 'updated']);
  });
  
  it('should merge explicit tag names with hashtags when updating', async () => {
    // Create initial log
    const createResponse = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Test Log',
        content_md: 'Initial content',
        tag_names: ['initial'],
        is_public: true
      })
    });
    
    const createdLog = await createResponse.json();
    
    // Update with both new content and explicit tags
    const updateResponse = await app.request(`/api/logs/${createdLog.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        content_md: 'Updated content with #hashtag',
        tag_names: ['explicit', 'tag']
      })
    });
    
    expect(updateResponse.status).toBe(200);
    const updatedLog = await updateResponse.json();
    
    // Should have both explicit tags and extracted hashtags
    expect(updatedLog.associated_tags).toHaveLength(3);
    const tagNames = updatedLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['explicit', 'hashtag', 'tag']);
  });
  
  it('should support both #{tagName} and #tagName hashtag formats', async () => {
    const response = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Mixed Format Test',
        content_md: 'Content with #{extended format} and #simple formats like #anime and #gaming',
        is_public: true
      })
    });
    
    expect(response.status).toBe(201);
    const createdLog = await response.json();
    
    expect(createdLog.associated_tags).toHaveLength(4);
    const tagNames = createdLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['anime', 'extended format', 'gaming', 'simple']);
  });
  
  it('should handle content without hashtags gracefully', async () => {
    const response = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'No Hashtags Log',
        content_md: 'Just some plain text with no hashtags at all.',
        is_public: true
      })
    });
    
    expect(response.status).toBe(201);
    const createdLog = await response.json();
    
    // Should have no associated tags
    expect(createdLog.associated_tags).toHaveLength(0);
  });
  
  it('should extract hashtags correctly from various formats', async () => {
    const response = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Mixed Content',
        content_md: 'I love #{anime series} and #gaming. Also enjoy #reading books.',
        is_public: true
      })
    });
    
    expect(response.status).toBe(201);
    const createdLog = await response.json();
    
    // Should extract all hashtags
    expect(createdLog.associated_tags).toHaveLength(3);
    const tagNames = createdLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['anime series', 'gaming', 'reading']);
  });
  
  it('should extract hashtags with periods (dots) correctly', async () => {
    const response = await app.request('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        title: 'Anime with dots in title',
        content_md: '#SSSS.GRIDMAN 何らかのテキスト。#{SSSS.DYNAZENON}も面白い。',
        is_public: true
      })
    });
    
    expect(response.status).toBe(201);
    const createdLog = await response.json();
    
    // Should extract hashtags with periods correctly
    expect(createdLog.associated_tags).toHaveLength(2);
    const tagNames = createdLog.associated_tags.map((t: any) => t.name).sort();
    expect(tagNames).toEqual(['SSSS.DYNAZENON', 'SSSS.GRIDMAN']);
  });
});