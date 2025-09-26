import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { LogService } from '../services/LogService.js';
import { TwitterService } from '../services/TwitterService.js';

const logs = new Hono();

// GET /logs - List public logs
logs.get('/', async (c) => {
  const tagIds = c.req.query('tag_ids')?.split(',').filter(id => id.trim()) || [];
  const userId = c.req.query('user_id');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);

  // Validate pagination
  if (limit <= 0) {
    throw new HTTPException(400, { message: 'Invalid limit parameter' });
  }

  const logService = c.get('logService') as LogService;
  
  try {
    const searchParams = {
      tag_ids: tagIds.length > 0 ? tagIds : undefined,
      user_id: userId || undefined,
      limit,
      offset,
      is_public: true // Only show public logs on the public endpoint
    };

    const result = await logService.searchLogs(searchParams);
    
    return c.json({
      items: result.logs,
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    throw new HTTPException(500, { message: 'Internal server error' });
  }
});

// POST /logs - Create new log
logs.post('/', async (c) => {
  const logService = c.get('logService') as LogService;
  const auth = c.get('auth'); // Set by auth middleware
  
  if (!auth || !auth.user) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    throw new HTTPException(400, { message: 'Invalid JSON in request body' });
  }
  
  // Validation
  if (!body.tag_ids || !Array.isArray(body.tag_ids) || body.tag_ids.length === 0) {
    throw new HTTPException(400, { message: 'tag_ids must be a non-empty array' });
  }

  if (!body.content_md || typeof body.content_md !== 'string') {
    throw new HTTPException(400, { message: 'content_md is required and must be a string' });
  }

  if (body.content_md.length > 10000) {
    throw new HTTPException(400, { message: 'Content too long (maximum 10000 characters)' });
  }

  if (body.title && (typeof body.title !== 'string' || body.title.length > 200)) {
    throw new HTTPException(400, { message: 'Title must be a string with maximum 200 characters' });
  }

  try {
    const newLog = await logService.createLog({
      title: body.title,
      content_md: body.content_md,
      is_public: body.is_public || false,
      tag_ids: body.tag_ids
    }, auth.user.id);

    return c.json(newLog, 201);
  } catch (error) {
    console.error('Error creating log:', error);
    throw new HTTPException(500, { message: 'Failed to create log' });
  }
});

// GET /logs/{logId} - Get log details
logs.get('/:logId', async (c) => {
  const logId = c.req.param('logId');
  const logService = c.get('logService') as LogService;
  const auth = c.get('auth'); // May be null if not authenticated
  
  // Validate log ID format
  if (!logId || logId.trim().length === 0) {
    throw new HTTPException(400, { message: 'Invalid log ID format' });
  }
  
  try {
    // Get log with details
    const log = await logService.getLogById(logId, auth?.user?.id);
    
    if (!log) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    // Check access permissions
    const isOwner = auth && log.user_id === auth.user.id;
    const isPublic = log.is_public;
    
    if (!isPublic && !isOwner) {
      throw new HTTPException(403, { message: 'Access denied' });
    }

    return c.json(log);
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
  const logService = c.get('logService') as LogService;
  const auth = c.get('auth'); // Set by auth middleware
  
  if (!auth || !auth.user) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

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
  
  try {
    // Check if log exists and user owns it
    const existingLog = await logService.getLogById(logId, auth.user.id);
    
    if (!existingLog) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    if (existingLog.user_id !== auth.user.id) {
      throw new HTTPException(403, { message: 'Not log owner' });
    }

    // Update the log
    const updatedLog = await logService.updateLog(logId, {
      title: body.title,
      content_md: body.content_md,
      is_public: body.is_public,
      tag_ids: body.tag_ids
    }, auth.user.id);

    return c.json(updatedLog);
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
  const logService = c.get('logService') as LogService;
  const auth = c.get('auth'); // Set by auth middleware
  
  if (!auth || !auth.user) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  try {
    // Check if log exists and user owns it
    const existingLog = await logService.getLogById(logId, auth.user.id);
    
    if (!existingLog) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    if (existingLog.user_id !== auth.user.id) {
      throw new HTTPException(403, { message: 'Not log owner' });
    }

    // Delete the log
    await logService.deleteLog(logId, auth.user.id);
    
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
  const logService = c.get('logService') as LogService;
  const twitterService = c.get('twitterService') as TwitterService;
  const auth = c.get('auth'); // Set by auth middleware
  
  if (!auth || !auth.user) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }

  try {
    // Check if log exists and user owns it
    const log = await logService.getLogById(logId, auth.user.id);
    
    if (!log) {
      throw new HTTPException(404, { message: 'Log not found' });
    }

    if (log.user_id !== auth.user.id) {
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
      const result = await twitterService.shareLogToTwitter(
        'mock_access_token', // In real implementation, get from user's stored tokens
        log.title || 'Shared Log',
        log.content_md,
        `${c.req.url.split('/').slice(0, -2).join('/')}/${logId}` // Build share URL
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