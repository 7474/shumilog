import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import app from '../helpers/app'

describe('POST /tags - Create Tag Contract', () => {
  beforeEach(async () => {
    // Setup test database state
  })

  afterEach(async () => {
    // Cleanup test data
  })

  it('should create a new tag with valid data', async () => {
    // Mock authenticated user session
    const mockSession = {
      userId: 'mock-user-id',
      twitterUsername: 'testuser'
    }
    
    const tagData = {
      name: 'Attack on Titan',
      description: 'Popular anime series',
      metadata: {
        year: 2013,
        studio: 'Studio WIT',
        official_url: 'https://attackontitan.com'
      }
    }

    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=mock-session-token'
      },
      body: JSON.stringify(tagData)
    })

    expect(response.status).toBe(201)
    
    const responseBody = await response.json()
    expect(responseBody).toMatchObject({
      id: expect.any(String),
      name: 'Attack on Titan',
      description: 'Popular anime series',
      metadata: {
        year: 2013,
        studio: 'Studio WIT',
        official_url: 'https://attackontitan.com'
      },
      created_by: 'mock-user-id',
      created_at: expect.any(String),
      updated_at: expect.any(String)
    })
  })

  it('should return 400 for invalid tag data', async () => {
    const invalidTagData = {
      // Missing required name field
      description: 'Invalid tag'
    }

    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=mock-session-token'
      },
      body: JSON.stringify(invalidTagData)
    })

    expect(response.status).toBe(400)
  })

  it('should return 401 when not authenticated', async () => {
    const tagData = {
      name: 'Test Tag',
      description: 'Test description'
    }

    const response = await app.request('/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tagData)
    })

    expect(response.status).toBe(401)
  })
})