import { Context, Next } from 'hono';

/**
 * キャッシュ制御ミドルウェア
 * GETリクエストで認証不要のエンドポイントに対して、Cloudflare Workers CDNにキャッシュされるように設定する
 * 
 * 戦略:
 * - Cache-Control: max-age=300（5分間キャッシュ）
 * - stale-while-revalidate=60（再検証中に古いコンテンツを提供可能）
 * - Vary: Origin（CORS以外の条件では同じ応答）
 */
export const cacheControl = () => {
  return async (c: Context, next: Next) => {
    await next();

    // GETリクエストのみキャッシュ対象
    if (c.req.method !== 'GET') {
      return;
    }

    // 認証情報がある場合はキャッシュしない
    const auth = c.get('auth');
    if (auth) {
      c.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      return;
    }

    // 成功レスポンス（2xx）のみキャッシュ対象
    const status = c.res.status;
    if (status < 200 || status >= 300) {
      c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      return;
    }

    // 公開エンドポイントに対してキャッシュヘッダを設定
    // 5分間キャッシュ、再検証中は古いコンテンツを60秒間提供可能
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    
    // CORS以外のリクエスト条件では応答内容は変化しない
    c.header('Vary', 'Origin');
  };
};
