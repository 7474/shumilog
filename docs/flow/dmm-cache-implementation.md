# DMM商品検索キャッシュ実装

## 概要

Cloudflare Workers Cache APIを使用して、DMM商品検索APIの結果をキャッシュする機能を実装しました。これにより、同じキーワードでの検索結果を24時間キャッシュし、外部APIへの呼び出しを削減します。

## 実装詳細

### 変更ファイル

1. **backend/src/services/DmmAffiliateService.ts**
   - `searchWithKeyword` メソッドにキャッシュロジックを追加
   - Cache APIの利用可否をチェック
   - キャッシュヒット時はキャッシュから返す
   - キャッシュミス時はAPIを呼び出し、結果をキャッシュに保存

2. **backend/tests/unit/DmmAffiliateService.test.ts**
   - キャッシュ機能のテストを5個追加
   - キャッシュヒット/ミスのシナリオ
   - Cache API未利用時のフォールバック
   - キャッシュ保存失敗時のエラーハンドリング

### キャッシュ戦略

```typescript
// 1. Cache APIの利用可否をチェック（テスト環境対応）
const cache = typeof caches !== 'undefined' ? caches.default : null;

// 2. キャッシュから取得を試行
if (cache) {
  const cacheKey = new Request(apiUrl);
  response = await cache.match(cacheKey);
  
  if (response) {
    console.log('[DmmAffiliateService] Cache hit for:', keyword);
  }
}

// 3. キャッシュミス時はAPIを呼び出し
if (!response) {
  console.log('[DmmAffiliateService] Cache miss, fetching from API:', keyword);
  response = await fetch(apiUrl);

  // 4. 成功レスポンスをキャッシュに保存（24時間）
  if (cache && response.ok) {
    const responseToCache = new Response(response.clone().body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });
    responseToCache.headers.set('Cache-Control', 'max-age=86400'); // 24時間
    
    try {
      await cache.put(new Request(apiUrl), responseToCache);
    } catch (cacheError) {
      // キャッシュ保存に失敗してもAPIレスポンスは返す
      console.warn('[DmmAffiliateService] Failed to cache response:', cacheError);
    }
  }
}
```

### キャッシュキー

キャッシュキーは、DMM APIのリクエストURL全体（クエリパラメータを含む）を使用します：

```
https://api.dmm.com/affiliate/v3/ItemList?api_id=xxx&affiliate_id=yyy&site=DMM.com&hits=5&keyword=anime&sort=rank&output=json
```

同じパラメータセットであれば、キャッシュがヒットします。

### TTL（Time To Live）

- **24時間（86400秒）** - `Cache-Control: max-age=86400` ヘッダーで設定
- 商品情報は頻繁に変わらないため、長めのTTLを設定
- 必要に応じて調整可能

### エラーハンドリング

1. **Cache API未利用時**
   - テスト環境など、`caches`が定義されていない場合は従来通り動作
   - キャッシュなしでAPIを直接呼び出す

2. **キャッシュ保存失敗時**
   - キャッシュ保存に失敗してもAPIレスポンスは返す
   - エラーログを出力して続行

3. **API呼び出し失敗時**
   - 既存のエラーハンドリングを維持
   - 空の配列を返す

## テスト結果

### ユニットテスト

全11テスト合格:
- ✅ 既存の7テスト（互換性確認）
- ✅ キャッシュヒット時の動作
- ✅ キャッシュミス時のAPI呼び出しとキャッシュ保存
- ✅ Cache API未利用時のフォールバック動作
- ✅ キャッシュ保存失敗時のエラーハンドリング

### 統合テスト

advertisement-credit.test.ts: 全4テスト合格
- ✅ ログ詳細でのDMM広告表示
- ✅ タグ詳細でのDMM広告表示

### コントラクトテスト

全108テスト合格（既存機能に影響なし）

## 期待される効果

1. **API呼び出し削減**
   - 同じキーワードでの検索は24時間キャッシュから返される
   - DMM APIの利用制限への影響を軽減

2. **レスポンス速度向上**
   - キャッシュヒット時は外部API呼び出しが不要
   - 数十ミリ秒の応答時間で結果を返せる

3. **信頼性向上**
   - DMM APIが一時的に利用できない場合もキャッシュから返せる
   - キャッシュ保存失敗時も通常動作を維持

4. **コスト削減**
   - 外部API呼び出し回数の削減
   - Cloudflare Workers実行時間の短縮

## 監視とメンテナンス

### ログ出力

実装では以下のログを出力します：

- `[DmmAffiliateService] Cache hit for: {keyword}` - キャッシュヒット
- `[DmmAffiliateService] Cache miss, fetching from API: {keyword}` - キャッシュミス
- `[DmmAffiliateService] Failed to cache response: {error}` - キャッシュ保存失敗（警告）

### 確認方法

開発環境では、ログ出力で以下を確認できます：

1. 初回アクセス時はCache missログが出力される
2. 2回目以降のアクセスでは同じキーワードに対してCache hitログが出力される
3. 異なるキーワードではCache missログが出力される

### TTL調整

必要に応じて、`DmmAffiliateService.ts`の以下の行でTTLを調整できます：

```typescript
responseToCache.headers.set('Cache-Control', 'max-age=86400'); // 86400秒 = 24時間
```

## 参考資料

- [Cloudflare Workers Cache API](https://developers.cloudflare.com/workers/examples/cache-using-fetch/)
- [DMM アフィリエイト API](https://affiliate.dmm.com/api/guide/)
