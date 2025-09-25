import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const logs = new Hono();

// Mock log data for now
const mockLogs = [
  {
    id: 'log_123',
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

  const body = await c.req.json();
  
  if (!body.tag_ids || !Array.isArray(body.tag_ids) || body.tag_ids.length === 0) {
    throw new HTTPException(400, { message: 'At least one tag is required' });
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
  const newLog = {
    id: crypto.randomUUID(),
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
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // Check if log is public or user is owner
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  const isOwner = sessionToken && log.user.id === 'user_123'; // TODO: Get actual user from session
  const isPublic = true; // TODO: Check log.is_public from database
  
  if (!isPublic && !isOwner) {
    throw new HTTPException(403, { message: 'Access denied' });
  }

  // Return log with additional details
  return c.json({
    ...log,
    is_public: isPublic,
    tags: log.associated_tags
  });
});

// PUT /logs/{logId} - Update log
logs.put('/:logId', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const logId = c.req.param('logId');
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // TODO: Check if user owns log
  if (log.user.id !== 'user_123') {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  const body = await c.req.json();
  
  // TODO: Update log in database
  const updatedLog = {
    ...log,
    title: body.title !== undefined ? body.title : log.title,
    content_md: body.content_md || log.content_md,
    updated_at: new Date().toISOString()
  };

  return c.json(updatedLog);
});

// DELETE /logs/{logId} - Delete log
logs.delete('/:logId', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const logId = c.req.param('logId');
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // TODO: Check if user owns log
  if (log.user.id !== 'user_123') {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  // TODO: Delete log from database
  
  return c.body(null, 204);
});

// POST /logs/{logId}/share - Share log to Twitter
logs.post('/:logId/share', async (c) => {
  const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  if (!sessionToken) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  const logId = c.req.param('logId');
  const log = mockLogs.find(l => l.id === logId);
  
  if (!log) {
    throw new HTTPException(404, { message: 'Log not found' });
  }

  // TODO: Check if user owns log
  if (log.user.id !== 'user_123') {
    throw new HTTPException(403, { message: 'Not log owner' });
  }

  // TODO: Check if log is public
  const isPublic = true; // TODO: Get from database
  if (!isPublic) {
    throw new HTTPException(400, { message: 'Cannot share private log' });
  }

  // TODO: Post to Twitter
  const twitterPostId = crypto.randomUUID();

  return c.json({
    twitter_post_id: twitterPostId
  });
});

export default logs;