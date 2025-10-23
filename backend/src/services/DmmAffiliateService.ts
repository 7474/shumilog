/**
 * DMMアフィリエイトサービス
 * DMMアフィリエイトAPIを使用してコンテンツに関連する広告を取得
 * API仕様: https://affiliate.dmm.com/api/guide/
 * 
 * 検索戦略:
 * 1. AND検索（スペース区切り）で複数キーワードにマッチする商品を優先検索
 * 2. AND検索で十分な結果が得られない場合、OR検索（|区切り）で補完
 * 3. sort=rank（人気順）を使用して、一般的なキーワードに引っ張られるのを防ぐ
 */

export interface DmmAffiliateConfig {
  apiId: string;
  affiliateId: string;
}

export interface DmmAdvertisement {
  productId: string;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  price?: string;
  serviceName?: string;
}

export interface DmmApiResponse {
  result: {
    status: number;
    result_count: number;
    total_count: number;
    first_position: number;
    items?: DmmApiItem[];
  };
}

interface DmmApiItem {
  service_name: string;
  floor_name: string;
  category_name: string;
  content_id: string;
  product_id: string;
  title: string;
  URL: string;
  affiliateURL: string;
  imageURL: {
    list: string;
    small: string;
    large: string;
  };
  prices?: {
    price: string;
  };
}

export class DmmAffiliateService {
  private readonly apiEndpoint = 'https://api.dmm.com/affiliate/v3/ItemList';

  constructor(private config: DmmAffiliateConfig) {}

  /**
   * DMMアフィリエイトのクレジット表記を取得
   * API仕様: https://affiliate.dmm.com/api/credit.html
   * @returns クレジット表記のHTML文字列
   */
  getCreditText(): string {
    return 'Powered by <a href="https://affiliate.dmm.com/api/">DMM.com Webサービス</a>';
  }

  /**
   * キーワードに基づいて広告を検索
   * @param keywords 検索キーワードのリスト
   * @param limit 取得する広告の最大数 (デフォルト: 3)
   */
  async searchAdvertisements(
    keywords: string[],
    limit: number = 3
  ): Promise<DmmAdvertisement[]> {
    if (keywords.length === 0) {
      return [];
    }

    // TODO R18判定ならFANZAにする
    const site = 'DMM.com';

    // まずAND検索（スペース区切り）を試行
    // 複数キーワードにマッチする商品を優先的に取得
    const andResults = await this.searchWithKeyword(
      keywords.join(' '),
      site,
      limit,
      'rank' // 人気順でソート
    );

    // AND検索で十分な結果が得られた場合はそれを返す
    if (andResults.length >= Math.min(limit, 3)) {
      return andResults;
    }

    // AND検索で結果が不足している場合、OR検索で補完
    const orResults = await this.searchWithKeyword(
      keywords.join('|'),
      site,
      limit,
      'rank' // 人気順でソート
    );

    // 重複を除いて結合
    const resultMap = new Map<string, DmmAdvertisement>();
    
    // AND検索の結果を優先
    for (const item of andResults) {
      resultMap.set(item.productId, item);
    }
    
    // OR検索の結果で補完
    for (const item of orResults) {
      if (!resultMap.has(item.productId)) {
        resultMap.set(item.productId, item);
      }
    }

    return Array.from(resultMap.values()).slice(0, limit);
  }

  /**
   * 指定されたキーワードでDMM APIを検索
   * Cloudflare Workers Cache APIを使用してレスポンスをキャッシュする
   * @param keyword 検索キーワード
   * @param site サイト名
   * @param limit 取得件数
   * @param sort ソート順
   */
  private async searchWithKeyword(
    keyword: string,
    site: string,
    limit: number,
    sort: 'rank' | 'match'
  ): Promise<DmmAdvertisement[]> {
    const params = new URLSearchParams({
      api_id: this.config.apiId,
      affiliate_id: this.config.affiliateId,
      site: site,
      hits: limit.toString(),
      keyword: keyword,
      sort: sort,
      output: 'json'
    });

    const apiUrl = `${this.apiEndpoint}?${params.toString()}`;

    try {
      // Cache APIが利用可能かチェック（テスト環境では利用できない場合がある）
      const cache = typeof caches !== 'undefined' ? caches.default : null;
      let response: Response | undefined;

      // キャッシュから取得を試みる
      if (cache) {
        const cacheKey = new Request(apiUrl);
        response = await cache.match(cacheKey);
        
        if (response) {
          console.log('[DmmAffiliateService] Cache hit for:', keyword);
        }
      }

      // キャッシュミスまたはCache API利用不可の場合は実際にAPIを呼び出す
      if (!response) {
        console.log('[DmmAffiliateService] Cache miss, fetching from API:', keyword);
        response = await fetch(apiUrl);

        // レスポンスをキャッシュに保存（24時間）
        if (cache && response.ok) {
          // レスポンスをクローンしてCache-Controlヘッダーを追加
          const responseToCache = new Response(response.clone().body, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
          });
          // 24時間キャッシュ
          responseToCache.headers.set('Cache-Control', 'max-age=86400');
          
          try {
            await cache.put(new Request(apiUrl), responseToCache);
          } catch (cacheError) {
            // キャッシュ保存に失敗してもAPIレスポンスは返す
            console.warn('[DmmAffiliateService] Failed to cache response:', cacheError);
          }
        }
      }

      if (!response.ok) {
        console.error('[DmmAffiliateService] API request failed:', response.status);
        return [];
      }

      const data: DmmApiResponse = await response.json();

      if (data.result.status !== 200 || !data.result.items) {
        return [];
      }

      return data.result.items.map((item) => this.mapToAdvertisement(item));
    } catch (error) {
      console.error('[DmmAffiliateService] Error fetching advertisements:', error);
      return [];
    }
  }

  /**
   * DMMアフィリエイトAPIのレスポンスを内部形式に変換
   */
  private mapToAdvertisement(item: DmmApiItem): DmmAdvertisement {
    return {
      productId: item.product_id,
      title: item.title,
      imageUrl: item.imageURL.small || item.imageURL.list,
      affiliateUrl: item.affiliateURL,
      price: item.prices?.price,
      serviceName: item.service_name
    };
  }
}
