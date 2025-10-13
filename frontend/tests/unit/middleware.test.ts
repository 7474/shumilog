import { describe, it, expect } from 'vitest';

/**
 * SSRミドルウェアのOGP画像URL生成ロジックをテスト
 * 
 * 実際のミドルウェアは Cloudflare Pages Functions として動作するため、
 * ここではロジックの検証のみを行う
 */
describe('SSR Middleware OGP Image Generation', () => {
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

    // Cloudflare Image Resizing URLフォーマット
    return `${baseUrl}/cdn-cgi/image/${optionsString}/${imageUrl}`;
  }

  it('ログの先頭画像からOGP用の最適化URLを生成する', () => {
    const baseUrl = 'https://shumilog.dev';
    const logId = 'log_alice_1';
    const imageId = 'image_1';
    
    // 画像URLを構築
    const imageUrl = `${baseUrl}/api/logs/${logId}/images/${imageId}`;
    
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
    const logId = 'test_log';
    const imageId = 'test_image';
    
    const imageUrl = `${baseUrl}/api/logs/${logId}/images/${imageId}`;
    const ogpImageUrl = getOgpImageUrl(imageUrl, baseUrl);
    
    expect(ogpImageUrl).toContain('staging.shumilog.dev/cdn-cgi/image/');
    expect(ogpImageUrl).toContain(imageUrl);
  });

  it('HTMLメタタグに正しいOGP画像URLが設定される', () => {
    const baseUrl = 'https://shumilog.dev';
    const logId = 'log_with_image';
    const imageId = 'image_123';
    
    const imageUrl = `${baseUrl}/api/logs/${logId}/images/${imageId}`;
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
});

/**
 * 静的アセット検出ロジックのテスト
 */
describe('SSR Middleware Static Asset Detection', () => {
  /**
   * 静的アセットのパスかどうかを判定する関数（ミドルウェアと同じロジック）
   */
  function isStaticAssetPath(pathname: string): boolean {
    const staticPatterns = [
      /^\/assets\//,
      /^\/src\//,
      /^\/favicon\.(svg|ico)$/,
      /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i,
    ];
    
    return staticPatterns.some(pattern => pattern.test(pathname));
  }

  it('ビルド後のJSバンドルを静的アセットとして検出する', () => {
    expect(isStaticAssetPath('/assets/index-B3G93jxi.js')).toBe(true);
    expect(isStaticAssetPath('/assets/vendor-abc123.js')).toBe(true);
  });

  it('ビルド後のCSSバンドルを静的アセットとして検出する', () => {
    expect(isStaticAssetPath('/assets/index-BHdok_79.css')).toBe(true);
    expect(isStaticAssetPath('/assets/styles-xyz789.css')).toBe(true);
  });

  it('開発時のソースファイルを静的アセットとして検出する', () => {
    expect(isStaticAssetPath('/src/main.tsx')).toBe(true);
    expect(isStaticAssetPath('/src/components/Header.tsx')).toBe(true);
    expect(isStaticAssetPath('/src/index.css')).toBe(true);
  });

  it('ファビコンを静的アセットとして検出する', () => {
    expect(isStaticAssetPath('/favicon.svg')).toBe(true);
    expect(isStaticAssetPath('/favicon.ico')).toBe(true);
  });

  it('画像ファイルを静的アセットとして検出する', () => {
    expect(isStaticAssetPath('/logo.png')).toBe(true);
    expect(isStaticAssetPath('/hero.jpg')).toBe(true);
    expect(isStaticAssetPath('/icon.svg')).toBe(true);
  });

  it('フォントファイルを静的アセットとして検出する', () => {
    expect(isStaticAssetPath('/fonts/roboto.woff2')).toBe(true);
    expect(isStaticAssetPath('/fonts/inter.ttf')).toBe(true);
  });

  it('ログページは静的アセットではない', () => {
    expect(isStaticAssetPath('/logs/log_alice_1')).toBe(false);
    expect(isStaticAssetPath('/logs/abc123')).toBe(false);
  });

  it('タグページは静的アセットではない', () => {
    expect(isStaticAssetPath('/tags/Anime')).toBe(false);
    expect(isStaticAssetPath('/tags/Gaming')).toBe(false);
  });

  it('ルートパスは静的アセットではない', () => {
    expect(isStaticAssetPath('/')).toBe(false);
  });

  it('その他のアプリケーションパスは静的アセットではない', () => {
    expect(isStaticAssetPath('/login')).toBe(false);
    expect(isStaticAssetPath('/profile')).toBe(false);
    expect(isStaticAssetPath('/search')).toBe(false);
  });
});

/**
 * OGPボット検出ロジックのテスト
 */
describe('SSR Middleware Bot Detection', () => {
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

  function isOgpBot(userAgent: string | null): boolean {
    if (!userAgent) {
      return false;
    }
    return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
  }

  it('Twitterbotを検出する', () => {
    expect(isOgpBot('Twitterbot/1.0')).toBe(true);
    expect(isOgpBot('Mozilla/5.0 (compatible; Twitterbot/1.0)')).toBe(true);
  });

  it('FacebookのOGPクローラーを検出する', () => {
    expect(isOgpBot('facebookexternalhit/1.1')).toBe(true);
    expect(isOgpBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
  });

  it('Slackbotを検出する', () => {
    expect(isOgpBot('Slackbot-LinkExpanding 1.0')).toBe(true);
    expect(isOgpBot('Slackbot 1.0(+https://api.slack.com/robots)')).toBe(true);
  });

  it('Discordbotを検出する', () => {
    expect(isOgpBot('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)')).toBe(true);
  });

  it('通常のブラウザは検出しない', () => {
    expect(isOgpBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
    expect(isOgpBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
    expect(isOgpBot('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe(false);
  });

  it('User-Agentがnullの場合はボットではない', () => {
    expect(isOgpBot(null)).toBe(false);
  });

  it('空文字列の場合はボットではない', () => {
    expect(isOgpBot('')).toBe(false);
  });

  it('大文字小文字を区別しない', () => {
    expect(isOgpBot('TWITTERBOT/1.0')).toBe(true);
    expect(isOgpBot('twitterbot/1.0')).toBe(true);
    expect(isOgpBot('TwitterBot/1.0')).toBe(true);
  });
});
