import { Hono } from 'hono';
import { DmmAffiliateService } from '../services/DmmAffiliateService';
import { LogService } from '../services/LogService.js';
import { TagService } from '../services/TagService.js';
import type { AppBindings } from '../index.js';

const advertisements = new Hono<AppBindings>();

const getLogService = (c: any): LogService => c.get('logService') as LogService;
const getTagService = (c: any): TagService => c.get('tagService') as TagService;

/**
 * GET /advertisements/logs/:logId
 * ログに関連する広告を取得
 */
advertisements.get('/logs/:logId', async (c) => {
  try {
    const logId = c.req.param('logId');
    const limit = Math.min(parseInt(c.req.query('limit') || '3'), 10);

    const logService = getLogService(c);

    // ログの取得
    const log = await logService.getLogById(logId);

    if (!log) {
      return c.json({ error: 'Log not found' }, 404);
    }

    // キーワードの構築: タイトル + タグ名
    const keywords: string[] = [];
    if (log.title) {
      keywords.push(log.title);
    }
    if (log.associated_tags && log.associated_tags.length > 0) {
      keywords.push(...log.associated_tags.slice(0, 5).map((tag: any) => tag.name));
    }

    // DMMアフィリエイトAPIが設定されていない場合は空の配列を返す
    let dmmApiId: string | undefined;
    let dmmAffiliateId: string | undefined;
    
    try {
      // Bindingsから取得を試みる
      const bindings = c.env as any;
      dmmApiId = bindings?.DMM_API_ID;
      dmmAffiliateId = bindings?.DMM_AFFILIATE_ID;
    } catch (error) {
      // エラーが発生した場合は空の配列を返す
      console.warn('[Advertisements] Error accessing DMM API credentials:', error);
    }

    if (!dmmApiId || !dmmAffiliateId) {
      console.warn('[Advertisements] DMM API credentials not configured');
      return c.json({ items: [] });
    }

    const dmmService = new DmmAffiliateService({
      apiId: dmmApiId,
      affiliateId: dmmAffiliateId
    });

    const advertisements = await dmmService.searchAdvertisements(keywords, limit);

    return c.json({ items: advertisements });
  } catch (error) {
    console.error('[Advertisements] Error in /logs/:logId endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /advertisements/tags/:tagId
 * タグに関連する広告を取得
 */
advertisements.get('/tags/:tagId', async (c) => {
  try {
    const tagId = c.req.param('tagId');
    const limit = Math.min(parseInt(c.req.query('limit') || '3'), 10);

    const tagService = getTagService(c);

    // タグの取得（タグ名またはタグIDで検索）
    let tag = await tagService.getTagByName(tagId);
    if (!tag) {
      tag = await tagService.getTagById(tagId);
    }

    if (!tag) {
      return c.json({ error: 'Tag not found' }, 404);
    }

    // キーワードの構築: タグ名
    const keywords = [tag.name];

    // DMMアフィリエイトAPIが設定されていない場合は空の配列を返す
    let dmmApiId: string | undefined;
    let dmmAffiliateId: string | undefined;
    
    try {
      // Bindingsから取得を試みる
      const bindings = c.env as any;
      dmmApiId = bindings?.DMM_API_ID;
      dmmAffiliateId = bindings?.DMM_AFFILIATE_ID;
    } catch (error) {
      // エラーが発生した場合は空の配列を返す
      console.warn('[Advertisements] Error accessing DMM API credentials:', error);
    }

    if (!dmmApiId || !dmmAffiliateId) {
      console.warn('[Advertisements] DMM API credentials not configured');
      return c.json({ items: [] });
    }

    const dmmService = new DmmAffiliateService({
      apiId: dmmApiId,
      affiliateId: dmmAffiliateId
    });

    const advertisements = await dmmService.searchAdvertisements(keywords, limit);

    return c.json({ items: advertisements });
  } catch (error) {
    console.error('[Advertisements] Error in /tags/:tagId endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default advertisements;
