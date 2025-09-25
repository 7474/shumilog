import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import app from '../helpers/app'

describe('DELETE /tags/{tagId} - Delete Tag Contract', () => {
  beforeEach(async () => {
    // Setup test database state
  })

  afterEach(async () => {
    // Cleanup test data
  })

  it('should delete tag when user is owner', async () => {
    const tagId = 'mock-tag-id'

    const response = await app.request(`/tags/${tagId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': 'session=mock-session-token'
      }
    })

    expect(response.status).toBe(204)
  })

  it('should return 401 when not authenticated', async () => {
    const tagId = 'mock-tag-id'

    const response = await app.request(`/tags/${tagId}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(401)
  })

  it('should return 403 when user is not tag owner', async () => {
    const tagId = 'mock-tag-id'

    const response = await app.request(`/tags/${tagId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': 'session=different-user-session'
      }
    })

    expect(response.status).toBe(403)
  })

  it('should return 404 for non-existent tag', async () => {
    const nonExistentTagId = 'non-existent-tag-id'

    const response = await app.request(`/tags/${nonExistentTagId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': 'session=mock-session-token'
      }
    })

    expect(response.status).toBe(404)
  })
})