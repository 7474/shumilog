# Wikipedia記事検索とAI生成の改善

## 問題の背景

### 発生していた問題
1. タグ名「きみの色」のような実在するWikipedia記事が「記事が見つからない」と誤報告される
2. AIがハルシネーション（架空のサブタイトル列挙など）を生成してしまう
3. AI拡張機能（`ai_enhanced` support_type）が正しく動作しない

### 根本原因
AIモデル（@cf/openai/gpt-oss-120b）には実際にWebを閲覧したりAPIを呼び出す能力がないため、プロンプトで「Wikipediaを検索して記事を取得せよ」と指示しても実行できない。その結果、AIは想像で情報を生成（ハルシネーション）してしまっていた。

## 解決策

### 実装アプローチ
Wikipedia検索をコード側で実装し、実際の記事内容をAIに渡すことで、AIは既に取得された確実な情報のみを処理する。

### 実装内容

#### 1. Wikipedia検索の複数戦略（`AiService.searchWikipediaArticle`）

```typescript
// 戦略1: 直接REST API summaryエンドポイントにアクセス
const article = await this.fetchWikipediaSummary(tagName);

// 戦略2: OpenSearch APIで検索
const searchResults = await this.searchWikipediaOpenSearch(tagName);

// 戦略3: バリエーション（曖昧さ回避ページ対策）
const variations = this.generateSearchVariations(tagName);
// 例: "きみの色 (映画)", "きみの色 (アニメ)" など
```

#### 2. 実際のWikipedia内容をAIに渡す

**変更前（問題あり）**:
```typescript
// AIに検索を依頼（AIはWebアクセスできないので実行不可）
const prompt = `日本語版Wikipediaで「${tagName}」を検索し...`;
```

**変更後（正しい）**:
```typescript
// まずコード側でWikipediaを検索
const article = await this.searchWikipediaArticle(tagName);

if (!article) {
  return { content: `「${tagName}」に関するWikipedia記事が見つかりませんでした。` };
}

// 実際の記事内容をAIに渡す
const prompt = `
## Wikipedia記事の内容
${article.extract}

この内容を要約し、関連タグを抽出してください。
`;
```

#### 3. ハルシネーション防止の強化

システムプロンプトで明示的に指示：
```
【絶対ルール】
1. 提供されたWikipedia記事の内容のみを参照すること
2. 記事に書かれていない情報は絶対に生成しないこと（ハルシネーション厳禁）
3. 不確実な情報や推測は一切含めないこと
4. サブタイトル・エピソード情報は記事に明記されているもののみ列挙すること
5. 記事に情報がない場合は、そのセクションを省略すること
```

## 影響範囲

### 変更されたファイル
- `backend/src/services/AiService.ts`: Wikipedia検索機能の追加、AI生成ロジックの改善
- `backend/tests/unit/AiService.test.ts`: 新しい動作を検証するテストの追加

### 影響を受ける機能
- タグのAI拡張機能（`POST /api/support/tags` with `support_type: "ai_enhanced"`）
- タグ編集画面でのAI支援機能

### 影響を受けない機能
- `wikipedia_summary` support_type（元々直接Wikipedia APIを呼んでいたので変更なし）
- その他のタグ機能（検索、一覧、詳細など）

## テスト

### 追加されたテスト
1. **Wikipedia検索の戦略テスト**
   - 直接アクセスが成功する場合
   - OpenSearch APIで見つかる場合
   - 記事が見つからない場合

2. **AIへの入力検証**
   - 実際のWikipedia内容がAIに渡されることの確認
   - ハルシネーション防止指示がプロンプトに含まれることの確認

3. **エッジケース**
   - Wikipedia記事が存在しない場合の処理
   - 曖昧さ回避ページへの対応

### テスト実行結果
```bash
# ユニットテスト
npm test -- tests/unit/AiService.test.ts
✓ 6 tests passed

# 全テスト
npm test
✓ 294 tests passed
```

## 使用例

### タグ「きみの色」でAI拡張を使用

**リクエスト**:
```bash
curl -X POST http://localhost:8787/api/support/tags \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<token>" \
  -d '{
    "tag_name": "きみの色",
    "support_type": "ai_enhanced"
  }'
```

**動作フロー**:
1. コード側でWikipediaを検索:
   - 直接アクセス: `https://ja.wikipedia.org/api/rest_v1/page/summary/きみの色`
   - 見つかった！→ 記事内容を取得

2. 実際の記事内容をAIに渡す:
   ```
   ## Wikipedia記事の内容
   2024年公開の日本のアニメーション映画。...
   ```

3. AIが記事内容のみに基づいて要約と関連タグを生成

4. レスポンス:
   ```json
   {
     "content": "2024年公開の日本のアニメーション映画。\n\n**関連タグ**: #アニメ #映画\n\n出典: [Wikipedia](https://ja.wikipedia.org/wiki/きみの色)",
     "support_type": "ai_enhanced"
   }
   ```

## 今後の改善案

1. **より高度な文字種変換**
   - ひらがな⇔カタカナ⇔漢字の自動変換
   - 表記ゆれへの対応

2. **キャッシュの実装**
   - Wikipedia検索結果をキャッシュして再利用
   - API呼び出し回数の削減

3. **リダイレクトの追跡**
   - Wikipediaのリダイレクトを自動追跡
   - より正確な記事検索

4. **エラーハンドリングの強化**
   - ネットワークエラー時のリトライ
   - 部分的な情報でも返せる場合の対応
