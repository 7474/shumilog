/**
 * Cloudflare Pages Functions Middleware
 * OGPボットリクエストをバックエンドのSSRエンドポイントにプロキシします
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
 * SSR対象のパスかどうかを判定
 */
function isSSRPath(pathname: string): boolean {
  // ログ詳細ページまたはタグ詳細ページ
  return pathname.startsWith('/logs/') || pathname.startsWith('/tags/');
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

  // ボットかつSSR対象パスの場合、バックエンドにプロキシ
  if (isOgpBot(userAgent) && isSSRPath(url.pathname)) {
    // バックエンドAPIのベースURL（環境変数から取得、デフォルトは本番環境）
    const backendBaseUrl = env.BACKEND_API_URL || 'https://api.shumilog.dev';
    const backendUrl = `${backendBaseUrl}${url.pathname}`;

    console.log(`[SSR Proxy] Bot detected: ${userAgent}, proxying to: ${backendUrl}`);

    try {
      // バックエンドのSSRエンドポイントにリクエストを転送
      const backendResponse = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent || 'Unknown Bot',
        },
      });

      // バックエンドからの応答をそのまま返す
      return backendResponse;
    } catch (error) {
      console.error('[SSR Proxy] Error fetching from backend:', error);
      // エラー時は通常のSPAを返す
      return next();
    }
  }

  // 通常のリクエストは次のハンドラーへ
  return next();
}
