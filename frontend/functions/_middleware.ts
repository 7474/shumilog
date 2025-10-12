/**
 * Cloudflare Pages Functions Middleware
 * 
 * このファイルは、shumilogの「SSRフレームワーク」として機能します。
 * Cloudflare Pages Functionsを活用することで、Next.js、Remix、Astro等の
 * 大規模フレームワークを導入することなく、軽量・シンプル・オープンな
 * SSR機能を実現しています。
 * 
 * 主な機能:
 * - OGPボット検出（Twitter、Facebook、Slack等）
 * - ログ・タグページのサーバーサイドレンダリング
 * - OGPメタタグの動的生成
 * - 画像の最適化（Cloudflare Image Resizing）
 * - エッジでの高速実行とキャッシュ
 * 
 * 詳細なアーキテクチャ: docs/ssr-framework.md
 * OGPボット向けにSSRを実行してメタタグを生成します
 */

// OGPボットのUser-Agentパターン
const BOT_PATTERNS = [
  /Twitterbot/i,
  /facebookexternalhit/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /Discordbot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Pinterestbot/i,
  /redditbot/i,
  /SkypeUriPreview/i,
  /vkShare/i,
  /W3C_Validator/i,
  /Googlebot/i,
  /bingbot/i,
  /Baiduspider/i,
];

/**
 * User-AgentからOGPボットを検出
 */
function isOgpBot(userAgent: string | null): boolean {
  if (!userAgent) {
    return false;
  }
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * HTMLエスケープ
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Markdownからプレーンテキストを抽出
 */
function extractPlainText(markdown: string, maxLength = 200): string {
  let text = markdown
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }

  return text;
}

/**
 * OGP HTMLを生成
 */
function generateOgpHtml(params: {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
}): string {
  const { title, description, url, image, type = 'website' } = params;
  const siteName = 'Shumilog';
  
  const truncatedDesc = description.length > 200 
    ? description.substring(0, 197) + '...' 
    : description;

  const escapedTitle = escapeHtml(title);
  const escapedDesc = escapeHtml(truncatedDesc);
  const escapedUrl = escapeHtml(url);
  const escapedSiteName = escapeHtml(siteName);

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#06aedd" />
    
    <title>${escapedTitle} - ${escapedSiteName}</title>
    <meta name="title" content="${escapedTitle}" />
    <meta name="description" content="${escapedDesc}" />
    
    <meta property="og:type" content="${escapeHtml(type)}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDesc}" />
    <meta property="og:site_name" content="${escapedSiteName}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
    
    <meta property="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
    <meta property="twitter:url" content="${escapedUrl}" />
    <meta property="twitter:title" content="${escapedTitle}" />
    <meta property="twitter:description" content="${escapedDesc}" />
    ${image ? `<meta property="twitter:image" content="${escapeHtml(image)}" />` : ''}
  </head>
  <body>
    <div id="root">
      <div style="max-width: 800px; margin: 40px auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
        <h1 style="color: #06aedd; margin-bottom: 20px;">${escapedTitle}</h1>
        <p style="color: #666; line-height: 1.6;">${escapedDesc}</p>
        <p style="margin-top: 20px; color: #999;">
          このページをブラウザで表示するには、JavaScriptを有効にしてください。
        </p>
      </div>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

/**
 * OGP用の画像URLを生成します
 * Cloudflare Image Resizingを使用してOGPに最適なサイズに変換します
 * 
 * @param imageUrl - 元の画像URL（完全なURL）
 * @param baseUrl - フロントエンドのベースURL
 * @returns OGP用に最適化された画像URL
 */
function getOgpImageUrl(imageUrl: string, baseUrl: string): string {
  const optionParts: string[] = [];
  
  // OGP推奨サイズ: 1200x630 (Twitter/Facebook)
  optionParts.push('width=1200');
  optionParts.push('height=630');
  optionParts.push('fit=cover');
  optionParts.push('quality=85');
  optionParts.push('format=auto');

  const optionsString = optionParts.join(',');

  // Cloudflare Image Resizing URLフォーマット
  return `${baseUrl}/cdn-cgi/image/${optionsString}/${imageUrl}`;
}

/**
 * ログ詳細ページのSSR
 */
async function handleLogSSR(logId: string, baseUrl: string, apiBaseUrl: string): Promise<Response | null> {
  try {
    const apiUrl = `${apiBaseUrl}/api/logs/${logId}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return null;
    }

    const log = await response.json();

    // 非公開ログはSSRしない
    if (!log.is_public) {
      return null;
    }

    const title = log.title || 'ログ';
    const description = extractPlainText(log.content_md || '', 200);
    const url = `${baseUrl}/logs/${logId}`;
    
    // 先頭の関連画像をOGP画像として使用
    let image: string | undefined = undefined;
    if (log.images && log.images.length > 0) {
      const firstImage = log.images[0];
      // 画像URLを構築（フロントエンド経由でアクセス）
      const imageUrl = `${baseUrl}/api/logs/${logId}/images/${firstImage.id}`;
      // Cloudflare Image Resizingで最適化
      image = getOgpImageUrl(imageUrl, baseUrl);
    }

    const html = generateOgpHtml({
      title,
      description,
      url,
      image,
      type: 'article',
    });

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('[SSR] Error generating log SSR:', error);
    return null;
  }
}

/**
 * タグ詳細ページのSSR
 */
async function handleTagSSR(tagName: string, baseUrl: string, apiBaseUrl: string): Promise<Response | null> {
  try {
    const apiUrl = `${apiBaseUrl}/api/tags/${encodeURIComponent(tagName)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return null;
    }

    const tag = await response.json();

    const title = `#${tag.name}`;
    const description = tag.description 
      ? extractPlainText(tag.description, 200)
      : `${tag.name}に関するログを探す`;
    const url = `${baseUrl}/tags/${encodeURIComponent(tagName)}`;

    const html = generateOgpHtml({
      title,
      description,
      url,
      type: 'website',
    });

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('[SSR] Error generating tag SSR:', error);
    return null;
  }
}

/**
 * Pages Functions Middleware
 */
export async function onRequest(context: {
  request: Request;
  env: Record<string, string>;
  next: () => Promise<Response>;
}) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent');

  // ボットでない場合は通常のSPAを返す
  if (!isOgpBot(userAgent)) {
    return next();
  }

  // API Base URL（環境変数から取得、デフォルトは本番環境のAPI）
  const apiBaseUrl = env.API_BASE_URL || 'https://api.shumilog.dev';
  const baseUrl = url.origin;

  console.log(`[SSR] Bot detected: ${userAgent}, generating SSR for: ${url.pathname}`);

  // ログ詳細ページのSSR
  const logMatch = url.pathname.match(/^\/logs\/([^/]+)$/);
  if (logMatch) {
    const logId = logMatch[1];
    const ssrResponse = await handleLogSSR(logId, baseUrl, apiBaseUrl);
    if (ssrResponse) {
      return ssrResponse;
    }
  }

  // タグ詳細ページのSSR
  const tagMatch = url.pathname.match(/^\/tags\/([^/]+)$/);
  if (tagMatch) {
    const tagName = decodeURIComponent(tagMatch[1]);
    const ssrResponse = await handleTagSSR(tagName, baseUrl, apiBaseUrl);
    if (ssrResponse) {
      return ssrResponse;
    }
  }

  // SSR生成に失敗した場合は通常のSPAを返す
  return next();
}
