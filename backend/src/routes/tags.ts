import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getAuthUser } from '../middleware/auth.js';
import { TagService } from '../services/TagService.js';
import { UserService } from '../services/UserService.js';
import { invalidateCache } from '../middleware/cache.js';

const tags = new Hono();

const resolveTagService = (c: any): TagService => {
  const service = (c as any).get('tagService') as TagService | undefined;
  if (!service) {
    throw new HTTPException(500, { message: 'Tag service not available' });
  }
  return service;
};

const resolveUserService = (c: any): UserService => {
  const service = (c as any).get('userService') as UserService | undefined;
  if (!service) {
    throw new HTTPException(500, { message: 'User service not available' });
  }
  return service;
};

const sanitizeLimit = (value?: string): number => {
  const parsed = Number.parseInt(value || '20', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
};

const sanitizeOffset = (value?: string): number => {
  const parsed = Number.parseInt(value || '0', 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

// GET /tags - Search and list tags (public)
tags.get('/', async (c) => {
  const tagService = resolveTagService(c);
  const search = c.req.query('search') || undefined;
  const limit = sanitizeLimit(c.req.query('limit'));
  const offset = sanitizeOffset(c.req.query('offset'));

  const result = await tagService.searchTags({ search, limit, offset });

  return c.json({
    items: result.items,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    has_more: result.has_next
  });
});

// POST /tags - Create new tag (requires auth via middleware)
tags.post('/', async (c) => {
  const user = getAuthUser(c);
  const tagService = resolveTagService(c);

  const body = await c.req.json();

  if (!body || typeof body !== 'object') {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const { name, description, metadata } = body;

  if (!name || typeof name !== 'string') {
    throw new HTTPException(400, { message: 'Tag name is required' });
  }

  if (name.length > 100) {
    throw new HTTPException(400, { message: 'Tag name must be 100 characters or fewer' });
  }

  if (metadata !== undefined && typeof metadata !== 'object') {
    throw new HTTPException(400, { message: 'Metadata must be an object' });
  }

  try {
    const newTag = await tagService.createTag(
      {
        name,
        description,
        metadata: metadata || {}
      },
      user.id
    );

    // タグ一覧のキャッシュを無効化
    const baseUrl = new URL(c.req.url).origin;
    await invalidateCache('/tags', baseUrl);
    await invalidateCache('/api/tags', baseUrl);

    return c.json(newTag, 201);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to create tag';
    if (/unique/i.test(message)) {
      throw new HTTPException(409, { message: 'Tag name already exists' });
    }
    console.error('Failed to create tag:', error);
    throw new HTTPException(500, { message: 'Failed to create tag' });
  }
});

// GET /tags/{tagId} - Get tag details (public)
// Accepts both tag ID and tag name for flexibility
tags.get('/:tagId', async (c) => {
  const tagService = resolveTagService(c);
  const tagIdOrName = c.req.param('tagId');

  // Try to get tag by name first (user-friendly URLs)
  let tag = await tagService.getTagByName(tagIdOrName);
  
  // If not found by name, try by ID (backward compatibility)
  if (!tag) {
    tag = await tagService.getTagById(tagIdOrName);
  }

  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  // Get tag details using the found tag's ID
  const detail = await tagService.getTagDetail(tag.id);
  if (!detail) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  return c.json({
    ...detail,
    associations: detail.associations
  });
});

// PUT /tags/{tagId} - Update tag (requires auth)
// Accepts both tag ID and tag name for flexibility
tags.put('/:tagId', async (c) => {
  const user = getAuthUser(c);
  const tagService = resolveTagService(c);
  const tagIdOrName = c.req.param('tagId');

  // Try to get tag by name first, then by ID
  let existing = await tagService.getTagByName(tagIdOrName);
  if (!existing) {
    existing = await tagService.getTagById(tagIdOrName);
  }
  
  if (!existing) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  if (existing.created_by !== user.id) {
    throw new HTTPException(403, { message: 'Not tag owner' });
  }

  const body = await c.req.json();
  if (!body || typeof body !== 'object') {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const updates: any = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length === 0) {
      throw new HTTPException(400, { message: 'Tag name must be a non-empty string' });
    }
    if (body.name.length > 100) {
      throw new HTTPException(400, { message: 'Tag name must be 100 characters or fewer' });
    }
    updates.name = body.name;
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      throw new HTTPException(400, { message: 'Description must be a string or null' });
    }
    updates.description = body.description;
  }

  if (body.metadata !== undefined) {
    if (body.metadata !== null && typeof body.metadata !== 'object') {
      throw new HTTPException(400, { message: 'Metadata must be an object' });
    }
    updates.metadata = body.metadata || {};
  }

  if (Object.keys(updates).length === 0) {
    throw new HTTPException(400, { message: 'No fields to update' });
  }

  try {
    const updated = await tagService.updateTag(existing.id, updates);
    
    // キャッシュを無効化して、更新後のコンテンツが確実に表示されるようにする
    const baseUrl = new URL(c.req.url).origin;
    // タグ詳細のキャッシュを削除（IDとnameの両方でアクセス可能なため両方削除）
    await invalidateCache(`/tags/${existing.id}`, baseUrl);
    await invalidateCache(`/api/tags/${existing.id}`, baseUrl);
    // nameが変更された場合は旧nameのキャッシュも削除、新nameのキャッシュも削除
    if (updates.name && updates.name !== existing.name) {
      await invalidateCache(`/tags/${existing.name}`, baseUrl);
      await invalidateCache(`/api/tags/${existing.name}`, baseUrl);
      await invalidateCache(`/tags/${updates.name}`, baseUrl);
      await invalidateCache(`/api/tags/${updates.name}`, baseUrl);
    } else {
      await invalidateCache(`/tags/${existing.name}`, baseUrl);
      await invalidateCache(`/api/tags/${existing.name}`, baseUrl);
    }
    // 一覧のキャッシュも削除
    await invalidateCache('/tags', baseUrl);
    await invalidateCache('/api/tags', baseUrl);
    
    return c.json(updated);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to update tag';
    if (/no fields/i.test(message)) {
      throw new HTTPException(400, { message: 'No fields to update' });
    }
    if (/not found/i.test(message)) {
      throw new HTTPException(404, { message: 'Tag not found' });
    }
    console.error('Failed to update tag:', error);
    throw new HTTPException(500, { message: 'Failed to update tag' });
  }
});

// DELETE /tags/{tagId} - Delete tag (requires admin privileges)
// Accepts both tag ID and tag name for flexibility
tags.delete('/:tagId', async (c) => {
  const user = getAuthUser(c);
  const tagService = resolveTagService(c);
  const userService = resolveUserService(c);
  const tagIdOrName = c.req.param('tagId');

  // Check admin privileges
  if (!userService.isAdmin(user)) {
    throw new HTTPException(403, { message: 'Admin privileges required to delete tags' });
  }

  // Try to get tag by name first, then by ID
  let existing = await tagService.getTagByName(tagIdOrName);
  if (!existing) {
    existing = await tagService.getTagById(tagIdOrName);
  }
  
  if (!existing) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  await tagService.deleteTag(existing.id);
  
  // キャッシュを無効化
  const baseUrl = new URL(c.req.url).origin;
  // タグ詳細のキャッシュを削除（IDとnameの両方）
  await invalidateCache(`/tags/${existing.id}`, baseUrl);
  await invalidateCache(`/api/tags/${existing.id}`, baseUrl);
  await invalidateCache(`/tags/${existing.name}`, baseUrl);
  await invalidateCache(`/api/tags/${existing.name}`, baseUrl);
  // 一覧のキャッシュも削除
  await invalidateCache('/tags', baseUrl);
  await invalidateCache('/api/tags', baseUrl);
  
  return c.body(null, 204);
});

// GET /tags/{tagId}/associations - List associated tags (public)
// Accepts both tag ID and tag name for flexibility
// Query parameter: sort=order (default) or sort=recent
tags.get('/:tagId/associations', async (c) => {
  const tagService = resolveTagService(c);
  const tagIdOrName = c.req.param('tagId');
  const sortBy = c.req.query('sort') === 'recent' ? 'recent' : 'order';

  // Try to get tag by name first, then by ID
  let tag = await tagService.getTagByName(tagIdOrName);
  if (!tag) {
    tag = await tagService.getTagById(tagIdOrName);
  }
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  const associations = await tagService.getTagAssociations(tag.id, sortBy);
  return c.json(associations);
});

// POST /tags/{tagId}/associations - Create association (requires auth)
// Accepts both tag ID and tag name for flexibility
tags.post('/:tagId/associations', async (c) => {
  const user = getAuthUser(c);
  const tagService = resolveTagService(c);
  const tagIdOrName = c.req.param('tagId');

  // Try to get tag by name first, then by ID
  let tag = await tagService.getTagByName(tagIdOrName);
  if (!tag) {
    tag = await tagService.getTagById(tagIdOrName);
  }
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  if (tag.created_by !== user.id) {
    throw new HTTPException(403, { message: 'Not tag owner' });
  }

  const body = await c.req.json();
  if (!body || typeof body !== 'object') {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const associatedTagId = body.associated_tag_id as string;
  if (!associatedTagId || typeof associatedTagId !== 'string') {
    throw new HTTPException(400, { message: 'Associated tag ID is required' });
  }

  if (associatedTagId === tag.id) {
    throw new HTTPException(400, { message: 'Cannot associate tag with itself' });
  }

  try {
    await tagService.createTagAssociation(tag.id, associatedTagId);
    
    // キャッシュを無効化（関連タグが変更されたため）
    const baseUrl = new URL(c.req.url).origin;
    // タグ詳細のキャッシュを削除（IDとnameの両方）
    await invalidateCache(`/tags/${tag.id}`, baseUrl);
    await invalidateCache(`/api/tags/${tag.id}`, baseUrl);
    await invalidateCache(`/tags/${tag.name}`, baseUrl);
    await invalidateCache(`/api/tags/${tag.name}`, baseUrl);
    
    return c.body(null, 201);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to create association';
    if (/not found/i.test(message)) {
      throw new HTTPException(404, { message });
    }
    if (/self-association/i.test(message)) {
      throw new HTTPException(400, { message });
    }
    console.error('Failed to create tag association:', error);
    throw new HTTPException(500, { message: 'Failed to create association' });
  }
});

// DELETE /tags/{tagId}/associations - Remove association (requires auth)
// Accepts both tag ID and tag name for flexibility
tags.delete('/:tagId/associations', async (c) => {
  const user = getAuthUser(c);
  const tagService = resolveTagService(c);
  const tagIdOrName = c.req.param('tagId');
  const associatedTagId = c.req.query('associated_tag_id');

  // Try to get tag by name first, then by ID
  let tag = await tagService.getTagByName(tagIdOrName);
  if (!tag) {
    tag = await tagService.getTagById(tagIdOrName);
  }
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  if (tag.created_by !== user.id) {
    throw new HTTPException(403, { message: 'Not tag owner' });
  }

  if (!associatedTagId) {
    throw new HTTPException(400, { message: 'Associated tag ID is required' });
  }

  try {
    await tagService.removeTagAssociation(tag.id, associatedTagId);
    
    // キャッシュを無効化（関連タグが変更されたため）
    const baseUrl = new URL(c.req.url).origin;
    // タグ詳細のキャッシュを削除（IDとnameの両方）
    await invalidateCache(`/tags/${tag.id}`, baseUrl);
    await invalidateCache(`/api/tags/${tag.id}`, baseUrl);
    await invalidateCache(`/tags/${tag.name}`, baseUrl);
    await invalidateCache(`/api/tags/${tag.name}`, baseUrl);
    
    return c.body(null, 204);
  } catch (error) {
    console.error('Failed to remove tag association:', error);
    throw new HTTPException(500, { message: 'Failed to remove association' });
  }
});

export default tags;