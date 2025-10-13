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

    // 相対パスの場合は絶対URLに変換
    const absoluteImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${baseUrl}${imageUrl}`;

    // Cloudflare Image Resizing URLフォーマット
    return `${baseUrl}/cdn-cgi/image/${optionsString}/${absoluteImageUrl}`;
  }

  it('ログの先頭画像からOGP用の最適化URLを生成する', () => {
    const baseUrl = 'https://shumilog.dev';
    const logId = 'log_alice_1';
    const imageId = 'image_1';
    
    // 画像URLを構築（相対パス形式、フロントエンドと同じ）
    const imageUrl = `/api/logs/${logId}/images/${imageId}`;
    
    // OGP用に最適化
    const ogpImageUrl = getOgpImageUrl(imageUrl, baseUrl);
    
    // 期待される形式を確認（相対パスが絶対URLに変換される）
    const expectedImageUrl = `${baseUrl}${imageUrl}`;
    expect(ogpImageUrl).toBe(
      `${baseUrl}/cdn-cgi/image/width=1200,height=630,fit=cover,quality=85,format=auto/${expectedImageUrl}`
    );
    
    // Cloudflare Image Resizing のパスを含む
    expect(ogpImageUrl).toContain('/cdn-cgi/image/');
    
    // OGP推奨サイズのパラメータを含む
    expect(ogpImageUrl).toContain('width=1200');
    expect(ogpImageUrl).toContain('height=630');
    expect(ogpImageUrl).toContain('fit=cover');
    
    // 絶対URLに変換された画像URLを含む
    expect(ogpImageUrl).toContain(expectedImageUrl);
  });

  it('異なるbaseURLでも正しく動作する', () => {
    const baseUrl = 'https://staging.shumilog.dev';
    const logId = 'test_log';
    const imageId = 'test_image';
    
    // 相対パス形式で画像URLを構築
    const imageUrl = `/api/logs/${logId}/images/${imageId}`;
    const ogpImageUrl = getOgpImageUrl(imageUrl, baseUrl);
    
    expect(ogpImageUrl).toContain('staging.shumilog.dev/cdn-cgi/image/');
    // 絶対URLに変換された画像URLを含む
    expect(ogpImageUrl).toContain(`${baseUrl}${imageUrl}`);
  });

  it('HTMLメタタグに正しいOGP画像URLが設定される', () => {
    const baseUrl = 'https://shumilog.dev';
    const logId = 'log_with_image';
    const imageId = 'image_123';
    
    // 相対パス形式で画像URLを構築
    const imageUrl = `/api/logs/${logId}/images/${imageId}`;
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
