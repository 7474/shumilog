import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import app from '../helpers/app'

describe('PUT /tags/{tagId} - Update Tag Contract', () => {
  beforeEach(async () => {
    // Setup test database state
  })

  afterEach(async () => {
    // Cleanup test data
  })

  it('should update tag with valid data', async () => {
    const tagId = 'mock-tag-id'
    const updateData = {
      name: 'Updated Tag Name',
      description: 'Updated description',
      metadata: {
        year: 2024,
        updated: true
      }
    }

    const response = await app.request(`/tags/${tagId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=mock-session-token'
      },
      body: JSON.stringify(updateData)
    })

    expect(response.status).toBe(200)
    
    const responseBody = await response.json()
    expect(responseBody).toMatchObject({
      id: tagId,
      name: 'Updated Tag Name',
      description: 'Updated description',
      metadata: {
        year: 2024,
        updated: true
      }
    })
  })

  it('should return 401 when not authenticated', async () => {
    const tagId = 'mock-tag-id'
    const updateData = {
      name: 'Updated Tag Name'
    }

    const response = await app.request(`/tags/${tagId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    expect(response.status).toBe(401)
  })

  it('should return 403 when user is not tag owner', async () => {
    const tagId = 'mock-tag-id'
    const updateData = {
      name: 'Updated Tag Name'
    }

    const response = await app.request(`/tags/${tagId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=different-user-session'
      },
      body: JSON.stringify(updateData)
    })

    expect(response.status).toBe(403)
  })

  it('should return 404 for non-existent tag', async () => {
    const nonExistentTagId = 'non-existent-tag-id'
    const updateData = {
      name: 'Updated Tag Name'
    }

    const response = await app.request(`/tags/${nonExistentTagId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=mock-session-token'
      },
      body: JSON.stringify(updateData)
    })

    expect(response.status).toBe(404)
  })
})