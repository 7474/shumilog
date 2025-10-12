import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { TagService } from '../services/TagService.js';

const support = new Hono();

const resolveTagService = (c: any): TagService => {
  const service = (c as any).get('tagService') as TagService | undefined;
  if (!service) {
    throw new HTTPException(500, { message: 'Tag service not available' });
  }
  return service;
};

// POST /support/tags - Get content support for tag editing (requires auth)
// This endpoint doesn't require an existing tag ID, so it can be used when creating new tags
support.post('/tags', async (c) => {
  // Authentication is required (enforced by middleware in index.ts)
  const tagService = resolveTagService(c);
  
  // AiServiceが利用可能な場合、TagServiceに設定
  const aiService = (c as any).get('aiService');
  if (aiService) {
    tagService.setAiService(aiService);
  }

  const body = await c.req.json();
  if (!body || typeof body !== 'object') {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const tagName = body.tag_name as string;
  if (!tagName || typeof tagName !== 'string' || tagName.trim().length === 0) {
    throw new HTTPException(400, { message: 'Tag name is required' });
  }

  const supportType = body.support_type as string;
  if (!supportType || typeof supportType !== 'string') {
    throw new HTTPException(400, { message: 'Support type is required' });
  }

  const validSupportTypes = ['wikipedia_summary', 'ai_enhanced', 'ai_enhanced_with_metadata'];
  if (!validSupportTypes.includes(supportType)) {
    throw new HTTPException(400, { message: `Invalid support type. Valid types: ${validSupportTypes.join(', ')}` });
  }

  try {
    const result = await tagService.getTagSupportByName(tagName, supportType);
    return c.json(result);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to get support content';
    
    if (/not found/i.test(message) || /no summary/i.test(message)) {
      throw new HTTPException(404, { message: 'Support content not available for this tag' });
    }
    
    console.error('Failed to get tag support:', error);
    throw new HTTPException(500, { message });
  }
});

export default support;
