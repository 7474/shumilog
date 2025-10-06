/**
 * fetchキャッシュユーティリティ
 * 
 * Cloudflare Workers Cache APIを使用して外部APIへのfetchリクエストをキャッシュします。
 * Ref: https://developers.cloudflare.com/workers/examples/cache-using-fetch/
 * 
 * ## 使用例
 * 
 * ```typescript
 * // 基本的な使い方（デフォルト1時間キャッシュ）
 * const response = await cachedFetch('https://api.example.com/data');
 * 
 * // カスタムTTLとキャッシュキーを指定
 * const response = await cachedFetch(
 *   'https://ja.wikipedia.org/api/rest_v1/page/summary/アニメ',
 *   { headers: { 'User-Agent': 'MyApp/1.0' } },
 *   { ttl: 86400, cacheKey: 'wikipedia:summary:アニメ' }
 * );
 * ```
 * 
 * ## 動作
 * 
 * - キャッシュヒット: キャッシュにデータが存在する場合、即座に返却
 * - キャッシュミス: 実際のAPIを呼び出し、成功時は自動的にキャッシュに保存
 * - エラー処理: 2xx以外のレスポンスはキャッシュされない
 * - フォールバック: Cache APIが利用できない環境では通常のfetchにフォールバック
 */

export interface FetchCacheOptions {
  /**
   * キャッシュのTTL（秒単位）
   * デフォルト: 3600（1時間）
   */
  ttl?: number;
  
  /**
   * カスタムキャッシュキー
   * 指定しない場合はURLがキーとして使用されます
   */
  cacheKey?: string;
}

// Cloudflare Workers環境でのcaches APIの型定義
declare const caches:
  | {
      default: {
        match(request: Request | URL | string): Promise<Response | undefined>;
        put(request: Request | URL | string, response: Response): Promise<void>;
        delete(request: Request | URL | string): Promise<boolean>;
      };
    }
  | undefined;

/**
 * Cache APIを使用してfetchリクエストをキャッシュします
 * 
 * @param url - リクエストURL
 * @param init - fetchのinit options
 * @param options - キャッシュオプション
 * @returns Response
 */
export async function cachedFetch(
  url: string | URL,
  init?: globalThis.RequestInit,
  options?: FetchCacheOptions
): Promise<Response> {
  const ttl = options?.ttl ?? 3600; // デフォルト1時間
  
  // Cache APIが利用可能かチェック（テスト環境では利用できない場合がある）
  if (typeof caches === 'undefined') {
    // Cache APIが利用できない場合は通常のfetchを実行
    return fetch(url, init);
  }

  // キャッシュキーの生成
  const cacheKey = options?.cacheKey ?? url.toString();
  const cacheUrl = new URL(cacheKey.startsWith('http') ? cacheKey : `https://cache.internal/${cacheKey}`);
  
  // キャッシュから取得を試みる
  const cache = caches.default;
  let response = await cache.match(cacheUrl);

  if (response) {
    // キャッシュヒット
    console.log(`Cache hit: ${cacheKey}`);
    return response;
  }

  // キャッシュミス - 実際のAPIを呼び出す
  console.log(`Cache miss: ${cacheKey}`);
  response = await fetch(url, init);

  // レスポンスが成功の場合のみキャッシュに保存
  if (response.ok) {
    // Responseをクローンしてキャッシュに保存（Responseは一度しか読めないため）
    const responseToCache = response.clone();
    
    // Cache-Controlヘッダーを設定
    const headers = new Headers(responseToCache.headers);
    headers.set('Cache-Control', `public, max-age=${ttl}`);
    
    const cachedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers
    });

    // 非同期でキャッシュに保存（レスポンスを待たない）
    // waitUntilを使用できる場合はそちらを使用するべきだが、
    // ここでは単純にPromiseを解決せずに実行
    cache.put(cacheUrl, cachedResponse).catch((err: unknown) => {
      console.error('Failed to cache response:', err);
    });
  }

  return response;
}

/**
 * 特定のキーのキャッシュを削除します
 * 
 * @param cacheKey - 削除するキャッシュのキー
 */
export async function invalidateCache(cacheKey: string): Promise<boolean> {
  if (typeof caches === 'undefined') {
    return false;
  }

  const cacheUrl = new URL(cacheKey.startsWith('http') ? cacheKey : `https://cache.internal/${cacheKey}`);
  const cache = caches.default;
  return await cache.delete(cacheUrl);
}

