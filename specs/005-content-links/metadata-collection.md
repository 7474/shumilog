# メタデータ収集機能

## 概要

タグのAI生成機能に、Wikipediaページから抽出したメタデータ（公式サイトURL、関連リンクなど）を含める機能を追加しました。

## 実装内容

### 1. メタデータ抽出機能

`AiService`に`extractMetadataFromWikipedia`メソッドを追加し、Wikipedia HTMLから以下の情報を抽出します：

- **公式サイト**: class="external"を持つリンクの中から、「公式」「オフィシャル」「Official」を含むものを抽出
- **関連リンク**: 外部リンクを最大10個まで収集（URL + タイトル）

### 2. AI指示への統合

抽出したメタデータを、AIへの指示プロンプトに含めることで、AIが以下を生成できるようにします：

- より正確なタグ説明
- 公式サイトや重要な関連リンクを含む「### 参考リンク」セクション

### 3. 新しいサポートタイプ

既存の機能を保持しつつ、新しい`ai_enhanced_with_metadata`サポートタイプを追加しました：

- `wikipedia_summary`: Wikipedia APIのサマリーを使用（既存）
- `ai_enhanced`: AIによる拡張生成、メタデータなし（既存）
- `ai_enhanced_with_metadata`: AIによる拡張生成、メタデータあり（**新規**）

## API使用例

```bash
POST /api/support/tags
Content-Type: application/json
Cookie: session=<session_token>

{
  "tag_name": "進撃の巨人",
  "support_type": "ai_enhanced_with_metadata"
}
```

レスポンス:
```json
{
  "content": "<!-- AI生成コンテンツ開始 -->\n\n...(AI生成コンテンツ)...\n\n### 参考リンク\n- [公式サイト](https://example.com/official)\n- [関連情報](https://example.com/info)\n\n<!-- AI生成コンテンツ終了 -->\n\n出典: [Wikipedia](<https://ja.wikipedia.org/wiki/進撃の巨人>)",
  "support_type": "ai_enhanced_with_metadata"
}
```

## 後方互換性

既存の`ai_enhanced`サポートタイプは変更されず、そのまま使用可能です。将来的には、フロントエンドで任意にサポートタイプを切り替えられるようにすることを想定しています。

## 技術仕様

### ExtractedMetadata インターフェース

```typescript
export interface ExtractedMetadata {
  officialSites: string[];  // 公式サイトのURL一覧
  relatedLinks: {           // 関連リンク
    url: string;
    title: string;
  }[];
}
```

### メタデータ抽出ロジック

1. Wikipedia HTMLをDOMパース（dominoライブラリ使用）
2. `a.external`セレクタで外部リンクを検索
3. リンクテキストまたはURLに「公式」「Official」などを含むものを公式サイトとして分類
4. すべての外部リンクを関連リンクとして収集（重複除去、最大10件）

## テスト

以下のテストを追加しました：

- `AiService.extractMetadataFromWikipedia`: メタデータ抽出機能の単体テスト
- `tag-support.test.ts`: 新しい`ai_enhanced_with_metadata`サポートタイプの統合テスト

すべてのテストが成功することを確認済みです。
