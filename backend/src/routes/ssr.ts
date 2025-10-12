import { Hono } from 'hono';
import { AppBindings } from '../index.js';
import { isOgpBot } from '../utils/botDetection.js';
import { generateOgpHtml, extractPlainTextFromMarkdown } from '../utils/ssrTemplate.js';

const ssr = new Hono<AppBindings>();

/**
 * ログ詳細ページのSSR
 * GET /logs/:logId
 */
ssr.get('/logs/:logId', async (c, next) => {
  const userAgent = c.req.header('User-Agent');
  
  // ボットでない場合は通常のSPAを返す（後続のミドルウェアに処理を任せる）
  if (!isOgpBot(userAgent)) {
    await next();
    return;
  }

  const logId = c.req.param('logId');
  const logService = c.get('logService');
  const config = c.get('config');

  try {
    // ログデータを取得（公開ログのみ）
    const log = await logService.getLogById(logId);

    if (!log || !log.is_public) {
      // ログが見つからない、または非公開の場合は通常のHTMLを返す
      await next();
      return;
    }

    // OGPメタデータを生成
    const title = log.title || 'ログ';
    const description = extractPlainTextFromMarkdown(log.content_md || '', 200);
    const url = `${config.appBaseUrl}/logs/${logId}`;
    const image = log.images && log.images.length > 0 ? log.images[0].url : undefined;

    const html = generateOgpHtml({
      title,
      description,
      url,
      image,
      type: 'article',
      siteName: 'Shumilog',
    });

    return c.html(html);
  } catch (error) {
    console.error('SSR error for log:', error);
    // エラーの場合は通常のSPAを返す
    await next();
  }
});

/**
 * タグ詳細ページのSSR
 * GET /tags/:name
 */
ssr.get('/tags/:name', async (c, next) => {
  const userAgent = c.req.header('User-Agent');
  
  // ボットでない場合は通常のSPAを返す
  if (!isOgpBot(userAgent)) {
    await next();
    return;
  }

  const tagName = decodeURIComponent(c.req.param('name'));
  const tagService = c.get('tagService');
  const config = c.get('config');

  try {
    // タグデータを取得
    const tag = await tagService.getTagByName(tagName);

    if (!tag) {
      // タグが見つからない場合は通常のHTMLを返す
      await next();
      return;
    }

    // OGPメタデータを生成
    const title = `#${tag.name}`;
    const description = tag.description 
      ? extractPlainTextFromMarkdown(tag.description, 200)
      : `${tag.name}に関するログを探す`;
    const url = `${config.appBaseUrl}/tags/${encodeURIComponent(tagName)}`;

    const html = generateOgpHtml({
      title,
      description,
      url,
      type: 'website',
      siteName: 'Shumilog',
    });

    return c.html(html);
  } catch (error) {
    console.error('SSR error for tag:', error);
    // エラーの場合は通常のSPAを返す
    await next();
  }
});

export default ssr;
