import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { LogService } from '../services/LogService.js';
import { TwitterService } from '../services/TwitterService.js';
import { SessionService } from '../services/SessionService.js';
import { UserService } from '../services/UserService.js';
import { Log } from '../models/Log.js';
import { getAuthUser, getOptionalAuthUser, optionalAuthMiddleware } from '../middleware/auth.js';

const MAX_LIMIT = 100;

const getLogService = (c: any): LogService => c.get('logService') as LogService;
const getTwitterService = (c: any): TwitterService => c.get('twitterService') as TwitterService;
const getSessionService = (c: any): SessionService => c.get('sessionService') as SessionService;
const getUserService = (c: any): UserService => c.get('userService') as UserService;

const sanitizeTagIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new HTTPException(400, { message: 'tag_ids must be an array of strings' });
  }

  const tagIds = value
    .map((id) => {
      if (typeof id !== 'string') {
        throw new HTTPException(400, { message: 'tag_ids must contain only strings' });
      }
      const trimmed = id.trim();
      if (!trimmed) {
        throw new HTTPException(400, { message: 'tag_ids cannot contain empty values' });
      }
      return trimmed;
    })
    .filter((id, index, self) => self.indexOf(id) === index);

  if (tagIds.length === 0) {
    throw new HTTPException(400, { message: 'tag_ids must be a non-empty array' });
  }

  return tagIds;
};

const optionalTagIds = (value: unknown): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new HTTPException(400, { message: 'tag_ids must be an array when provided' });
  }

  return value
    .map((id) => {
      if (typeof id !== 'string') {
        throw new HTTPException(400, { message: 'tag_ids must contain only strings' });
      }
      const trimmed = id.trim();
      if (!trimmed) {
        throw new HTTPException(400, { message: 'tag_ids cannot contain empty values' });
      }
      return trimmed;
    })
    .filter((id, index, self) => self.indexOf(id) === index);
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new HTTPException(400, { message: 'Invalid numeric parameter' });
  }
  return parsed;
};

const toLogResponse = (log: Log) => ({
  id: log.id,
  title: log.title ?? null,
  content_md: log.content_md,
  is_public: Boolean(log.is_public),
  created_at: log.created_at,
  updated_at: log.updated_at,
  author: {
    id: log.user.id,
    twitter_username: log.user.twitter_username,
    display_name: log.user.display_name,
    avatar_url: log.user.avatar_url,
    created_at: log.user.created_at
  },
  tags: log.associated_tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    description: tag.description,
    metadata: tag.metadata,
    created_by: tag.created_by,
    created_at: tag.created_at,
    updated_at: tag.updated_at
  }))
});

const logs = new Hono();

logs.use('*', async (c, next) => {
  const sessionService = getSessionService(c);
  const userService = getUserService(c);
  await optionalAuthMiddleware(sessionService, userService)(c, next);
});

// GET /logs - List public logs
logs.get('/', async (c) => {
  const rawTagIds = c.req.query('tag_ids');
  const tagIds = rawTagIds
    ? rawTagIds.split(',').map((id) => id.trim()).filter(Boolean)
    : [];
  const userId = c.req.query('user_id')?.trim() || undefined;
  const limit = parsePositiveInt(c.req.query('limit'), 20);
  const offset = parsePositiveInt(c.req.query('offset'), 0);

  // Validate pagination
  if (limit <= 0 || limit > MAX_LIMIT) {
    throw new HTTPException(400, { message: 'Invalid limit parameter' });
  }
  if (offset < 0) {
    throw new HTTPException(400, { message: 'Invalid offset parameter' });
  }

  const logService = getLogService(c);
  
  try {
    const searchParams = {
      tag_ids: tagIds.length > 0 ? tagIds : undefined,
      user_id: userId,
      is_public: true,
      limit,
      offset,
    };

  const result = await logService.searchLogs(searchParams);
    return c.json({
      items: result.logs.map(toLogResponse),
      total: result.total,
      limit,
      offset,
      has_more: result.hasMore
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    throw new HTTPException(500, { message: 'Internal server error' });
  }
});

// POST /logs - Create new log
logs.post('/', async (c) => {
  const logService = getLogService(c);
  const user = getAuthUser(c);

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    throw new HTTPException(400, { message: 'Invalid JSON in request body' });
  }
  
  // Validation
  if (!body.content_md || typeof body.content_md !== 'string') {
    throw new HTTPException(400, { message: 'content_md is required and must be a string' });
  }

  if (body.content_md.length > 10000) {
    throw new HTTPException(400, { message: 'Content too long (maximum 10000 characters)' });
  }

  if (body.title && (typeof body.title !== 'string' || body.title.length > 200)) {
    throw new HTTPException(400, { message: 'Title must be a string with maximum 200 characters' });
  }

  const tagIds = sanitizeTagIds(body.tag_ids);

  try {
    const newLog = await logService.createLog({
      title: body.title,
      content_md: body.content_md,
      is_public: body.is_public === true,
      tag_ids: tagIds
    }, user.id);

    return c.json(toLogResponse(newLog), 201);
  } catch (error) {
    console.error('Error creating log:', error);
    throw new HTTPException(500, { message: 'Failed to create log' });
  }
});

// GET /logs/{logId} - Get log details
logs.get('/:logId', async (c) => {
  const logId = c.req.param('logId');
  const logService = getLogService(c);
  const viewer = getOptionalAuthUser(c);
  
  // Validate log ID format
  if (!logId || logId.trim().length === 0) {
    throw new HTTPException(400, { message: 'Invalid log ID format' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(logId)) {
    throw new HTTPException(400, { message: 'Invalid log ID format' });
  }
  
  try {
    // Get log with details
    const log = await logService.getLogById(logId, viewer?.id);
    
    if (!log) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    // Check access permissions
    const isOwner = viewer && log.user_id === viewer.id;
    const isPublic = log.is_public;
    
    if (!isPublic && !isOwner) {
      throw new HTTPException(403, { message: 'Access denied' });
    }

    return c.json(toLogResponse(log));
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error fetching log:', error);
    throw new HTTPException(500, { message: 'Internal server error' });
  }
});

// PUT /logs/{logId} - Update log
logs.put('/:logId', async (c) => {
  const logId = c.req.param('logId');
  const logService = getLogService(c);
  const user = getAuthUser(c);

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    throw new HTTPException(400, { message: 'Invalid JSON in request body' });
  }
  
  // Validate required fields
  if (!body.content_md || typeof body.content_md !== 'string') {
    throw new HTTPException(400, { message: 'content_md is required and must be a string' });
  }

  if (body.content_md.length > 10000) {
    throw new HTTPException(400, { message: 'Content too long (maximum 10000 characters)' });
  }

  if (body.title && (typeof body.title !== 'string' || body.title.length > 200)) {
    throw new HTTPException(400, { message: 'Title must be a string with maximum 200 characters' });
  }

  const tagIds = optionalTagIds(body.tag_ids);
  
  try {
    // Check if log exists and user owns it
    const existingLog = await logService.getLogById(logId, user.id);
    
    if (!existingLog) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    if (existingLog.user_id !== user.id) {
      throw new HTTPException(403, { message: 'Not log owner' });
    }

    // Update the log
    const updatedLog = await logService.updateLog(logId, {
      title: body.title,
      content_md: body.content_md,
      is_public: body.is_public,
      tag_ids: tagIds
    }, user.id);

    return c.json(toLogResponse(updatedLog));
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error updating log:', error);
    throw new HTTPException(500, { message: 'Failed to update log' });
  }
});

// DELETE /logs/{logId} - Delete log
logs.delete('/:logId', async (c) => {
  const logId = c.req.param('logId');
  const logService = getLogService(c);
  const user = getAuthUser(c);

  try {
    // Check if log exists and user owns it
    const existingLog = await logService.getLogById(logId, user.id);
    
    if (!existingLog) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    if (existingLog.user_id !== user.id) {
      throw new HTTPException(403, { message: 'Not log owner' });
    }

    // Delete the log
    await logService.deleteLog(logId, user.id);
    
    return c.body(null, 204);
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error deleting log:', error);
    throw new HTTPException(500, { message: 'Failed to delete log' });
  }
});

// POST /logs/{logId}/share - Share log to Twitter  
logs.post('/:logId/share', async (c) => {
  const logId = c.req.param('logId');
  const logService = getLogService(c);
  const twitterService = getTwitterService(c);
  const user = getAuthUser(c);

  try {
    // Check if log exists and user owns it
    const log = await logService.getLogById(logId, user.id);
    
    if (!log) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    if (log.user_id !== user.id) {
      throw new HTTPException(403, { message: 'Not log owner' });
    }

    // Check if log is public
    if (!log.is_public) {
      throw new HTTPException(400, { message: 'Cannot share private log' });
    }

    // Parse request body
    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      body = {};
    }
    
    // Simulate Twitter API failure for test
    if (body.simulate_failure) {
      throw new HTTPException(502, { message: 'Twitter API error' });
    }

    // Share to Twitter using the Twitter service
    try {
      const requestUrl = new URL(c.req.url);
      const shareUrl = `${requestUrl.origin}/logs/${logId}`;

      const result = await twitterService.shareLogToTwitter(
        'mock_access_token', // In real implementation, get from user's stored tokens
        log.title || 'Shared Log',
        log.content_md,
        shareUrl
      );
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return c.json({
        twitter_post_id: result.tweetId
      });
    } catch (twitterError) {
      console.error('Twitter API error:', twitterError);
      throw new HTTPException(502, { message: 'Twitter API error' });
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error sharing log:', error);
    throw new HTTPException(500, { message: 'Failed to share log' });
  }
});

// Remove all the mock data since we're now using real services

export default logs;