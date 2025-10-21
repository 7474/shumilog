# Wikipedia検索フォールバック機能

## 概要
タグサポート機能でWikipediaの記事を取得する際、直接タイトル検索で見つからない場合に、Wikipedia OpenSearch APIを使用して記事を検索するフォールバック機能を実装しました。

## 問題点
以前の実装では、Wikipedia REST APIの`/page/summary/{title}`エンドポイントを使用して記事を取得していました。このエンドポイントは完全一致するタイトルが必要なため、以下のような問題がありました：

- タグ名と記事タイトルが完全一致しない場合、404エラーが返される
- 例: タグ「きみの色」の記事が存在するが、タイトルが「きみの色 (映画)」の場合

## 解決方法

### 実装概要
3段階のフォールバック機構を実装しました：

1. **直接検索**: まず`/page/summary/{tagName}`で直接検索
2. **フォールバック検索**: 404エラーの場合、OpenSearch APIで`{tagName}`を検索
3. **再検索**: 見つかった記事タイトルで再度REST API検索

### コード構造

#### `searchWikipediaArticle()` メソッド
```typescript
private async searchWikipediaArticle(searchTerm: string): Promise<string | null>
```

- Wikipedia OpenSearch APIを使用してタグ名で記事を検索
- 検索結果から最も関連性の高い記事タイトルを返す
- エラーまたは結果なしの場合は`null`を返す

#### `getWikipediaSummary()` メソッドの改善
```typescript
private async getWikipediaSummary(tagName: string): Promise<{ content: string; support_type: string }>
```

改善内容：
1. 最初にREST APIで直接検索を試行
2. 404エラーの場合、`searchWikipediaArticle()`を呼び出し
3. 見つかったタイトルで再度REST API検索
4. 最終的に記事が見つからない場合はエラーをスロー

## 使用例

### APIリクエスト
```bash
curl -X POST http://localhost:8787/api/support/tags \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "tag_name": "きみの色",
    "support_type": "wikipedia_summary"
  }'
```

### 処理フロー
```
1. 直接検索: /page/summary/きみの色
   → 404 Not Found

2. OpenSearch検索: action=opensearch&search=きみの色
   → 結果: ["きみの色"]

3. 再検索: /page/summary/きみの色
   → 200 OK
   → 記事の要約を取得
```

## テスト

### ユニットテスト
`backend/tests/unit/TagService.test.ts`に以下のテストケースを追加：

1. **should fall back to search when direct Wikipedia lookup fails**
   - 直接検索が失敗した場合のフォールバック動作を検証
   - OpenSearch APIで記事を見つけ、再検索で取得できることを確認

2. **should throw error when search also fails to find article**
   - 直接検索もOpenSearchも失敗した場合のエラー処理を検証

### テスト実行結果
```
✓ should fall back to search when direct Wikipedia lookup fails
✓ should throw error when search also fails to find article
```

全テスト: 295/295 合格 ✅

## Wikipedia API仕様

### REST API - Page Summary
- エンドポイント: `https://ja.wikipedia.org/api/rest_v1/page/summary/{title}`
- 用途: 記事の要約を取得
- 制限: タイトルの完全一致が必要

### OpenSearch API
- エンドポイント: `https://ja.wikipedia.org/w/api.php`
- パラメータ:
  - `action=opensearch`: OpenSearch形式での検索
  - `search={query}`: 検索クエリ
  - `limit=1`: 結果数の制限
  - `namespace=0`: メインネームスペース（記事）のみ
  - `format=json`: JSON形式で結果を取得
- レスポンス形式: `[query, [titles], [descriptions], [urls]]`

## パフォーマンスへの影響

- **通常ケース（直接検索成功）**: 影響なし（1回のAPI呼び出し）
- **フォールバックケース（直接検索失敗）**: +2回のAPI呼び出し
  - OpenSearch API: 1回
  - REST API再検索: 1回

フォールバックは記事が存在するが完全一致しない場合のみ発生するため、影響は最小限です。

## 今後の改善案

1. **キャッシュの導入**: 検索結果をキャッシュして再検索を削減
2. **リダイレクト処理**: Wikipedia APIのリダイレクト情報を活用
3. **検索精度の向上**: 複数の検索結果から最適な記事を選択

## 関連ファイル

- `backend/src/services/TagService.ts` - 実装
- `backend/tests/unit/TagService.test.ts` - ユニットテスト
- `backend/tests/integration/tag-support.test.ts` - 統合テスト
- `docs/flow/wikipedia-search-fallback.md` - このドキュメント

## 参考資料

- [Wikipedia REST API Documentation](https://www.mediawiki.org/wiki/API:REST_API)
- [Wikipedia OpenSearch API](https://www.mediawiki.org/wiki/API:Opensearch)
- [MediaWiki API Documentation](https://www.mediawiki.org/wiki/API:Main_page)
