import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  app,
  clearTestData,
  setupTestEnvironment
} from '../backend/tests/helpers/app';

describe('Debug Auth', () => {
  let sessionToken: string;
  
  beforeEach(async () => {
    sessionToken = await setupTestEnvironment();
  });
  
  afterEach(async () => {
    await clearTestData();
  });
  
  it('should authenticate POST and PUT consistently', async () => {
    console.log('Session token:', sessionToken);
    
    // Test POST first
    const postResponse = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'Test Tag',
        description: 'Test description'
      })
    });
    
    console.log('POST status:', postResponse.status);
    expect(postResponse.status).toBe(201);
    const createdTag = await postResponse.json();
    console.log('Created tag:', createdTag);
    
    // Test PUT on the same tag
    const putResponse = await app.request(`/tags/${createdTag.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        description: 'Updated description'
      })
    });
    
    console.log('PUT status:', putResponse.status);
    if (putResponse.status !== 200) {
      const errorBody = await putResponse.text();
      console.log('PUT error:', errorBody);
    }
    expect(putResponse.status).toBe(200);
  });
});