import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getAuthUser, authMiddleware } from '../middleware/auth.js';
import { TagService } from '../services/TagService.js';
import { UserService } from '../services/UserService.js';
import { SessionService } from '../services/SessionService.js';

const tags = new Hono();

// Mock tag data for now
const mockTags = [
  {
    id: 'tag_anime',
    name: 'Anime',
    description: 'Japanese animated series and films',
    metadata: { supports_episodes: true },
    created_by: 'system',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'tag_manga',
    name: 'Manga',
    description: 'Japanese comics and graphic novels',
    metadata: { supports_episodes: true },
    created_by: 'system',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'tag_game',
    name: 'Game',
    description: 'Video games and interactive entertainment',
    metadata: { supports_episodes: false },
    created_by: 'system',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }
];

// GET /tags - Search and list tags
tags.get('/', async (c) => {
  const search = c.req.query('search') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  // Apply search filter
  let filteredTags = mockTags;
  if (search) {
    filteredTags = mockTags.filter(tag => 
      tag.name.toLowerCase().includes(search.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(search.toLowerCase()))
    );
  }

  // Apply pagination
  const paginatedTags = filteredTags.slice(offset, offset + limit);

  return c.json({
    items: paginatedTags,
    total: filteredTags.length,
    limit: Math.min(limit, 100), // Enforce max limit
    offset: offset
  });
});

// POST /tags - Create new tag
tags.post('/', async (c) => {
  // Use auth helper to get authenticated user
  const user = getAuthUser(c);

  const body = await c.req.json();
  
  if (!body.name) {
    throw new HTTPException(400, { message: 'Tag name is required' });
  }

  if (body.name.length > 200) {
    throw new HTTPException(400, { message: 'Tag name too long' });
  }

  // Get TagService from context
  const tagService = (c as any).get('tagService') as TagService;
  
  // Create tag using TagService
  const newTag = await tagService.createTag({
    name: body.name,
    description: body.description || '',
    metadata: body.metadata || {}
  }, user.id);

  return c.json(newTag, 201);
});

// GET /tags/{tagId} - Get tag details
tags.get('/:tagId', async (c) => {
  const tagId = c.req.param('tagId');
  const tag = mockTags.find(t => t.id === tagId);
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  // Return tag with additional details
  return c.json({
    ...tag,
    log_count: 0, // TODO: Count from database
    recent_logs: [], // TODO: Get from database
    associated_tags: [] // TODO: Get from database
  });
});

// PUT /tags/{tagId} - Update tag
tags.put('/:tagId', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const tagId = c.req.param('tagId');
  const tag = mockTags.find(t => t.id === tagId);
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  // TODO: Check if user owns tag
  if (tag.created_by !== 'user_123') {
    throw new HTTPException(403, { message: 'Not tag owner' });
  }

  const body = await c.req.json();
  
  // TODO: Update tag in database
  const updatedTag = {
    ...tag,
    name: body.name || tag.name,
    description: body.description !== undefined ? body.description : tag.description,
    metadata: body.metadata || tag.metadata,
    updated_at: new Date().toISOString()
  };

  return c.json(updatedTag);
});

// DELETE /tags/{tagId} - Delete tag
tags.delete('/:tagId', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const tagId = c.req.param('tagId');
  const tag = mockTags.find(t => t.id === tagId);
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  // TODO: Check if user owns tag
  if (tag.created_by !== 'user_123') {
    throw new HTTPException(403, { message: 'Not tag owner' });
  }

  // TODO: Delete tag from database
  
  return c.body(null, 204);
});

// GET /tags/{tagId}/associations - Get associated tags
tags.get('/:tagId/associations', async (c) => {
  const tagId = c.req.param('tagId');
  const tag = mockTags.find(t => t.id === tagId);
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  // TODO: Get associated tags from database
  return c.json([]);
});

// POST /tags/{tagId}/associations - Create tag association
tags.post('/:tagId/associations', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const tagId = c.req.param('tagId');
  const tag = mockTags.find(t => t.id === tagId);
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  const body = await c.req.json();
  
  if (!body.associated_tag_id) {
    throw new HTTPException(400, { message: 'Associated tag ID is required' });
  }

  // TODO: Create association in database
  
  return c.body(null, 201);
});

// DELETE /tags/{tagId}/associations - Remove tag association
tags.delete('/:tagId/associations', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const tagId = c.req.param('tagId');
  const associatedTagId = c.req.query('associated_tag_id');
  
  if (!associatedTagId) {
    throw new HTTPException(400, { message: 'Associated tag ID is required' });
  }

  const tag = mockTags.find(t => t.id === tagId);
  
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  // TODO: Remove association from database
  
  return c.body(null, 204);
});

export default tags;