import { Context, Next } from 'hono';

/**
 * Cache API ミドルウェア
 * Cloudflare Workers Cache API を使用して応答をキャッシュする
 * GETリクエストで認証不要のエンドポイントに対してキャッシュを適用
 */
export const cacheApi = () => {
  return async (c: Context, next: Next) => {
    // GETリクエストのみキャッシュ対象
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    // 認証情報がある場合はキャッシュしない
    const auth = c.get('auth');
    if (auth) {
      await next();
      return;
    }

    // Cache API が利用可能かチェック（テスト環境では利用できない場合がある）
    if (typeof caches === 'undefined') {
      await next();
      return;
    }

    // Cache API を使用
    const cache = caches.default;
    const cacheKey = new Request(c.req.url, c.req.raw);
    
    // キャッシュから取得を試みる
    let response = await cache.match(cacheKey);
    
    if (response) {
      // キャッシュヒット - X-Cache-Status ヘッダーを追加
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Cache-Status', 'HIT');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // キャッシュミス - レスポンスを生成
    await next();
    
    // 非公開データを含むレスポンスはキャッシュしない
    const hasPrivateData = c.get('hasPrivateData');
    if (hasPrivateData) {
      return;
    }

    // 成功レスポンス（2xx）のみキャッシュ
    const status = c.res.status;
    if (status < 200 || status >= 300) {
      return;
    }

    // レスポンスをキャッシュに保存
    // Cache-Control ヘッダーがある場合はそれに従う
    response = c.res.clone();
    
    // X-Cache-Status ヘッダーを追加
    c.header('X-Cache-Status', 'MISS');
    
    // キャッシュに保存（非同期）
    // executionCtx が利用可能な場合のみ waitUntil を使用
    if (c.executionCtx) {
      c.executionCtx.waitUntil(cache.put(cacheKey, response));
    } else {
      // テスト環境などでは即座に保存
      await cache.put(cacheKey, response);
    }
  };
};

/**
 * キャッシュ制御ミドルウェア
 * GETリクエストで認証不要のエンドポイントに対して、Cloudflare Workers CDNにキャッシュされるように設定する
 * 
 * 戦略:
 * - Cache-Control: max-age=300（ブラウザキャッシュ：5分間）
 * - s-maxage=300（CDN等の共有キャッシュ：5分間）
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

    // 非公開データを含むレスポンスはキャッシュしない
    const hasPrivateData = c.get('hasPrivateData');
    if (hasPrivateData) {
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
    c.header('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    
    // CORS以外のリクエスト条件では応答内容は変化しない
    c.header('Vary', 'Origin');
  };
};
