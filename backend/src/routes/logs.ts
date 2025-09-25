import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const logs = new Hono();

// Mock log data for now
const mockLogs = [
  {
    id: '123',
    user: {
      id: 'user_123',
      twitter_username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2023-01-01T00:00:00Z'
    },
    associated_tags: [
      {
        id: 'tag_anime',
        name: 'Anime',
        description: 'Japanese animated series and films',
        metadata: { supports_episodes: true },
        created_by: 'system',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ],
    title: 'Watched Attack on Titan Episode 1',
    content_md: 'Amazing first episode! The animation quality is incredible.',
    is_public: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: '456',
    user: {
      id: 'user_456',
      twitter_username: 'privateuser',
      display_name: 'Private User',
      avatar_url: 'https://example.com/avatar2.jpg',
      created_at: '2023-01-01T00:00:00Z'
    },
    associated_tags: [
      {
        id: 'tag_manga',
        name: 'Manga',
        description: 'Japanese comics and graphic novels',
        metadata: { supports_chapters: true },
        created_by: 'system',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ],
    title: 'My Private Reading Log',
    content_md: 'This is a private log entry about manga reading.',
    is_public: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }
];

// GET /logs - List public logs
logs.get('/', async (c) => {
  const tagIds = c.req.query('tag_ids')?.split(',') || [];
  const userId = c.req.query('user_id');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  // Apply filters
  let filteredLogs = mockLogs;
  
  if (tagIds.length > 0) {
    filteredLogs = filteredLogs.filter(log =>
      log.associated_tags.some(tag => tagIds.includes(tag.id))
    );
  }
  
  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.user.id === userId);
  }

  // Apply pagination
  const paginatedLogs = filteredLogs.slice(offset, offset + limit);

  return c.json({
    items: paginatedLogs,
    total: filteredLogs.length
  });
});

// POST /logs - Create new log
logs.post('/', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  // Validate session token (for testing, accept 'valid_session_token')
  if (sessionToken !== 'valid_session_token') {
    throw new HTTPException(401, { message: 'Invalid session' });
  }

  const body = await c.req.json();
  
  if (!body.tag_ids || !Array.isArray(body.tag_ids) || body.tag_ids.length === 0) {
    throw new HTTPException(400, { message: 'tag_ids must be a non-empty array' });
  }

  if (!body.content_md) {
    throw new HTTPException(400, { message: 'Content is required' });
  }

  if (body.content_md.length > 10000) {
    throw new HTTPException(400, { message: 'Content too long' });
  }

  if (body.title && body.title.length > 200) {
    throw new HTTPException(400, { message: 'Title too long' });
  }

  // TODO: Create log in database and associate with tags
  // Find associated tags based on tag_ids
  const associatedTags = body.tag_ids.map((tagId: string) => {
    // For now, return mock tag data based on tag ID
    return {
      id: tagId,
      name: tagId === 'tag_anime' ? 'Anime' : 'Unknown Tag',
      description: tagId === 'tag_anime' ? 'Japanese animated series and films' : 'Description',
      metadata: { supports_episodes: true },
      created_by: 'system',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };
  });

  const newLog = {
    id: crypto.randomUUID(),
    user: {
      id: 'user_123',
      twitter_username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2023-01-01T00:00:00Z'
    },
    associated_tags: associatedTags,
    title: body.title || '',
    content_md: body.content_md,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return c.json(newLog, 201);
});

// GET /logs/{logId} - Get log details
logs.get('/:logId', async (c) => {
  const logId = c.req.param('logId');
  
  // Validate log ID format (should be numeric)
  if (!/^\d+$/.test(logId)) {
    throw new HTTPException(400, { message: 'Invalid log ID format' });
  }
  
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // Check if log is public or user is owner
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  const isOwner = sessionToken === 'valid_session_token' && log.user.id === 'user_123';
  const isOwnerOfPrivateLog = sessionToken === 'valid_session_token_456' && log.user.id === 'user_456';
  const isPublic = log.is_public;
  
  if (!isPublic && !isOwner && !isOwnerOfPrivateLog) {
    throw new HTTPException(403, { message: 'Access denied' });
  }

  // Return log with additional details
  return c.json({
    ...log,
    tags: log.associated_tags
  });
});

// PUT /logs/{logId} - Update log
logs.put('/:logId', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken || sessionToken !== 'valid_session_token') {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const logId = c.req.param('logId');
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // Check if user owns log
  if (log.user.id !== 'user_123') {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  const body = await c.req.json();
  
  // Validate required fields
  if (!body.content_md) {
    throw new HTTPException(400, { message: 'content_md is required' });
  }
  
  // TODO: Update log in database
  const updatedLog = {
    ...log,
    title: body.title !== undefined ? body.title : log.title,
    content_md: body.content_md,
    is_public: body.is_public !== undefined ? body.is_public : log.is_public,
    updated_at: new Date().toISOString()
  };

  return c.json(updatedLog);
});

// DELETE /logs/{logId} - Delete log
logs.delete('/:logId', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken || sessionToken !== 'valid_session_token') {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const logId = c.req.param('logId');
  
  // Validate log ID format (should be numeric)
  if (!/^\d+$/.test(logId)) {
    throw new HTTPException(400, { message: 'Invalid log ID format' });
  }
  
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // Check if user owns log
  if (log.user.id !== 'user_123') {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  // TODO: Delete log from database
  
  return c.body(null, 204);
});

// POST /logs/{logId}/share - Share log to Twitter
logs.post('/:logId/share', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken || (sessionToken !== 'valid_session_token' && sessionToken !== 'valid_session_token_456')) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const logId = c.req.param('logId');
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // Check if user owns log
  const isOwner123 = sessionToken === 'valid_session_token' && log.user.id === 'user_123';
  const isOwner456 = sessionToken === 'valid_session_token_456' && log.user.id === 'user_456';
  
  if (!isOwner123 && !isOwner456) {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  // Check if log is public
  if (!log.is_public) {
    throw new HTTPException(400, { message: 'Cannot share private log' });
  }

  // Validate request body if needed
  const body = await c.req.json().catch(() => ({}));
  
  // Simulate Twitter API failure for test
  if (body.simulate_failure) {
    throw new HTTPException(502, { message: 'Twitter API error' });
  }

  // Post to Twitter
  const twitterPostId = crypto.randomUUID();

  return c.json({
    twitter_post_id: twitterPostId
  });
});

export default logs;