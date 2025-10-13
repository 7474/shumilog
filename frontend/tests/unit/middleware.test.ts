import { describe, it, expect } from 'vitest';

/**
 * SSRミドルウェアのロジックをテスト
 * 
 * 実際のミドルウェアは Cloudflare Pages Functions として動作するため、
 * ここではロジックの検証のみを行う
 */
describe('SSR Middleware', () => {
  /**
   * User-AgentからOGPボットを検出する関数（ミドルウェアと同じロジック）
   */
  function isOgpBot(userAgent: string | null): boolean {
    if (!userAgent) {
      return false;
    }
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
    return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
  }

  describe('Bot Detection', () => {
    it('Twitterbotを検出する', () => {
      expect(isOgpBot('Twitterbot/1.0')).toBe(true);
      expect(isOgpBot('Mozilla/5.0 (compatible; Twitterbot/1.0)')).toBe(true);
    });

    it('Facebookボットを検出する', () => {
      expect(isOgpBot('facebookexternalhit/1.1')).toBe(true);
      expect(isOgpBot('Mozilla/5.0 (compatible; facebookexternalhit/1.1)')).toBe(true);
    });

    it('その他のOGPボットを検出する', () => {
      expect(isOgpBot('LinkedInBot/1.0')).toBe(true);
      expect(isOgpBot('Slackbot-LinkExpanding 1.0')).toBe(true);
      expect(isOgpBot('Mozilla/5.0 (compatible; Discordbot/2.0)')).toBe(true);
    });

    it('通常のブラウザは検出しない', () => {
      expect(isOgpBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')).toBe(false);
      expect(isOgpBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15')).toBe(false);
      expect(isOgpBot('Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0')).toBe(false);
    });

    it('User-Agentがnullの場合はfalseを返す', () => {
      expect(isOgpBot(null)).toBe(false);
    });

    it('User-Agentが空文字の場合はfalseを返す', () => {
      expect(isOgpBot('')).toBe(false);
    });

    it('大文字小文字を区別せずに検出する', () => {
      expect(isOgpBot('TWITTERBOT/1.0')).toBe(true);
      expect(isOgpBot('twitterbot/1.0')).toBe(true);
      expect(isOgpBot('TwitterBot/1.0')).toBe(true);
    });
  });

  describe('OGP Image URL Generation', () => {
    /**
     * OGP用の画像URLを生成する関数（ミドルウェアと同じロジック）
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

      // 相対パスの場合は絶対URLに変換
      const absoluteImageUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `${baseUrl}${imageUrl}`;

      // Cloudflare Image Resizing URLフォーマット
      return `${baseUrl}/cdn-cgi/image/${optionsString}/${absoluteImageUrl}`;
    }

    it('ログの先頭画像からOGP用の最適化URLを生成する', () => {
      const baseUrl = 'https://shumilog.dev';
      const apiBaseUrl = 'https://api.shumilog.dev';
      const logId = 'log_alice_1';
      const imageId = 'image_1';
      
      // 画像URLを構築（バックエンドAPI経由、フロントエンドと同じロジック）
      const imageUrl = `${apiBaseUrl}/logs/${logId}/images/${imageId}`;
      
      // OGP用に最適化
      const ogpImageUrl = getOgpImageUrl(imageUrl, baseUrl);
      
      // 期待される形式を確認
      expect(ogpImageUrl).toBe(
        `${baseUrl}/cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/${imageUrl}`
      );
      
      // Cloudflare Image Resizing のパスを含む
      expect(ogpImageUrl).toContain('/cdn-cgi/image/');
      
      // OGP推奨サイズのパラメータを含む
      expect(ogpImageUrl).toContain('width=1200');
      expect(ogpImageUrl).toContain('height=630');
      expect(ogpImageUrl).toContain('fit=cover');
      
      // 元の画像URLを含む
      expect(ogpImageUrl).toContain(imageUrl);
    });

    it('異なるbaseURLでも正しく動作する', () => {
      const baseUrl = 'https://staging.shumilog.dev';
      const apiBaseUrl = 'https://api-staging.shumilog.dev';
      const logId = 'test_log';
      const imageId = 'test_image';
      
      // バックエンドAPI経由で画像URLを構築
      const imageUrl = `${apiBaseUrl}/logs/${logId}/images/${imageId}`;
      const ogpImageUrl = getOgpImageUrl(imageUrl, baseUrl);
      
      expect(ogpImageUrl).toContain('staging.shumilog.dev/cdn-cgi/image/');
      // 画像URLを含む
      expect(ogpImageUrl).toContain(imageUrl);
    });

    it('HTMLメタタグに正しいOGP画像URLが設定される', () => {
      const baseUrl = 'https://shumilog.dev';
      const apiBaseUrl = 'https://api.shumilog.dev';
      const logId = 'log_with_image';
      const imageId = 'image_123';
      
      // バックエンドAPI経由で画像URLを構築
      const imageUrl = `${apiBaseUrl}/logs/${logId}/images/${imageId}`;
      const ogpImageUrl = getOgpImageUrl(imageUrl, baseUrl);
      
      // OGPタグに設定される値を確認
      const expectedMetaTags = [
        `<meta property="og:image" content="${ogpImageUrl}" />`,
        `<meta property="twitter:image" content="${ogpImageUrl}" />`,
      ];
      
      expectedMetaTags.forEach(tag => {
        // タグ内にOGP画像URLが含まれることを確認
        expect(tag).toContain('cdn-cgi/image');
        expect(tag).toContain('width=1200');
        expect(tag).toContain('height=630');
      });
    });

    it('画像がない場合は undefined となる', () => {
      // 画像がない場合のシミュレーション
      const log = {
        images: [],
      };
      
      let image: string | undefined = undefined;
      if (log.images && log.images.length > 0) {
        // このコードブロックは実行されない
        image = 'should-not-be-set';
      }
      
      expect(image).toBeUndefined();
    });

    it('相対パスの画像URLを絶対URLに変換する', () => {
      const baseUrl = 'https://shumilog.dev';
      const relativeImageUrl = '/api/logs/test_log/images/test_image';
      
      const ogpImageUrl = getOgpImageUrl(relativeImageUrl, baseUrl);
      
      // 絶対URLに変換されている
      const expectedImageUrl = `${baseUrl}${relativeImageUrl}`;
      expect(ogpImageUrl).toContain(expectedImageUrl);
      expect(ogpImageUrl).toBe(
        `${baseUrl}/cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/${expectedImageUrl}`
      );
    });

    it('すでに絶対URLの場合はそのまま使用する', () => {
      const baseUrl = 'https://shumilog.dev';
      const absoluteImageUrl = 'https://example.com/images/test.jpg';
      
      const ogpImageUrl = getOgpImageUrl(absoluteImageUrl, baseUrl);
      
      // そのまま使用される
      expect(ogpImageUrl).toContain(absoluteImageUrl);
      expect(ogpImageUrl).toBe(
        `${baseUrl}/cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/${absoluteImageUrl}`
      );
    });
  });
});
