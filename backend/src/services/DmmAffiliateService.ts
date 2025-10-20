/**
 * DMMアフィリエイトサービス
 * DMMアフィリエイトAPIを使用してコンテンツに関連する広告を取得
 * API仕様: https://affiliate.dmm.com/api/guide/
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
    return 'Powered by <a href="https://www.dmm.com/netgame_s/affiliate/-/ai_subscribe/" target="_blank" rel="nofollow noopener">DMM アフィリエイト</a>';
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

    // キーワードを結合して検索クエリを作成
    const keyword = keywords.join(' ');

    const params = new URLSearchParams({
      api_id: this.config.apiId,
      affiliate_id: this.config.affiliateId,
      site: 'FANZA', // FANZAサイトを使用
      service: 'digital', // デジタルコンテンツ
      floor: 'videoa', // アダルトビデオフロア以外の指定も可能
      hits: limit.toString(),
      keyword: keyword,
      sort: 'rank', // ランキング順
      output: 'json'
    });

    try {
      const response = await fetch(`${this.apiEndpoint}?${params.toString()}`);

      if (!response.ok) {
        console.error('[DmmAffiliateService] API request failed:', response.status);
        return [];
      }

      const data: DmmApiResponse = await response.json();

      if (data.result.status !== 200 || !data.result.items) {
        console.error('[DmmAffiliateService] API returned error:', data.result.status);
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
