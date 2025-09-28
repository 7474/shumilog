import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  app,
  clearTestData,
  createTestSession,
  createTestUser,
  setupTestEnvironment
} from '../helpers/app';

describe('Hashtag Processing Integration', () => {
  let sessionToken: string;
  
  beforeEach(async () => {
    sessionToken = await setupTestEnvironment();
  });
  
  afterEach(async () => {
    await clearTestData();
  });
  
  it('should extract hashtags and create tag associations when creating a tag', async () => {
    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'Main Tag',
        description: 'This tag is related to #{anime} and #{manga} content'
      })
    });
    
    expect(response.status).toBe(201);
    const createdTag = await response.json();
    expect(createdTag.name).toBe('Main Tag');
    
    // Get the tag detail to check associations
    const detailResponse = await app.request(`/tags/${createdTag.id}`);
    expect(detailResponse.status).toBe(200);
    const tagDetail = await detailResponse.json();
    
    // Should have associations with anime and manga tags
    expect(tagDetail.associations).toHaveLength(2);
    const associationNames = tagDetail.associations.map((t: any) => t.name).sort();
    expect(associationNames).toEqual(['anime', 'manga']);
  });
  
  it('should link to existing tags when hashtags match existing tag names', async () => {
    // Create an existing tag first
    const existingResponse = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'existingTag',
        description: 'Pre-existing tag'
      })
    });
    
    expect(existingResponse.status).toBe(201);
    const existingTag = await existingResponse.json();
    
    // Create new tag referencing the existing one
    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'New Tag',
        description: 'This references #{existingTag} and #{newTag}'
      })
    });
    
    expect(response.status).toBe(201);
    const createdTag = await response.json();
    
    // Check associations
    const detailResponse = await app.request(`/tags/${createdTag.id}`);
    const tagDetail = await detailResponse.json();
    
    expect(tagDetail.associations).toHaveLength(2);
    const associationNames = tagDetail.associations.map((t: any) => t.name).sort();
    expect(associationNames).toEqual(['existingTag', 'newTag']);
    
    // Verify the existing tag is linked (not a duplicate)
    const associatedExistingTag = tagDetail.associations.find((t: any) => t.name === 'existingTag');
    expect(associatedExistingTag.id).toBe(existingTag.id);
    expect(associatedExistingTag.description).toBe('Pre-existing tag');
  });
  
  it('should process hashtags when updating a tag', async () => {
    // Create initial tag
    const createResponse = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'Update Test',
        description: 'Initial description'
      })
    });
    
    const createdTag = await createResponse.json();
    
    // Update with hashtags
    const updateResponse = await app.request(`/tags/${createdTag.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        description: 'Updated description with #{gaming} reference'
      })
    });
    
    expect(updateResponse.status).toBe(200);
    
    // Check associations
    const detailResponse = await app.request(`/tags/${createdTag.id}`);
    const tagDetail = await detailResponse.json();
    
    expect(tagDetail.associations).toHaveLength(1);
    expect(tagDetail.associations[0].name).toBe('gaming');
  });
  
  it('should handle Japanese characters in hashtags', async () => {
    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'Japanese Test',
        description: 'Content about #{アニメ} and #{ゲーム}'
      })
    });
    
    expect(response.status).toBe(201);
    const createdTag = await response.json();
    
    // Check associations
    const detailResponse = await app.request(`/tags/${createdTag.id}`);
    const tagDetail = await detailResponse.json();
    
    expect(tagDetail.associations).toHaveLength(2);
    const associationNames = tagDetail.associations.map((t: any) => t.name).sort();
    expect(associationNames).toEqual(['アニメ', 'ゲーム']);
  });
  
  it('should not create self-associations', async () => {
    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'selfRef',
        description: 'This references #{selfRef} itself'
      })
    });
    
    expect(response.status).toBe(201);
    const createdTag = await response.json();
    
    // Check that no self-association was created
    const detailResponse = await app.request(`/tags/${createdTag.id}`);
    const tagDetail = await detailResponse.json();
    
    expect(tagDetail.associations).toHaveLength(0);
  });
  
  it('should support both #{tagName} and #tagName hashtag formats', async () => {
    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'Mixed Format Test',
        description: 'This supports both #{extended format} and #simple formats like #anime and #gaming'
      })
    });
    
    expect(response.status).toBe(201);
    const createdTag = await response.json();
    
    // Check associations
    const detailResponse = await app.request(`/tags/${createdTag.id}`);
    const tagDetail = await detailResponse.json();
    
    expect(tagDetail.associations).toHaveLength(3);
    const associationNames = tagDetail.associations.map((t: any) => t.name).sort();
    expect(associationNames).toEqual(['anime', 'extended format', 'gaming']);
  });
});