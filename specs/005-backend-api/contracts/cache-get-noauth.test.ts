import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

describe('GET/認証不要APIキャッシュ', () => {
  it('GETかつ認証不要APIは5分間CDNキャッシュされる', async () => {
    // 実装前なので常に失敗させる
    expect(false).toBe(true);
  });
});
