# メタデータ収集機能

## 概要

タグのAI生成機能に、Wikipediaページから抽出したメタデータ（公式サイトURL、関連リンクなど）をAI指示プロンプトに自動的に含める機能を実装しました。

**重要**: AI サービスは内部でWikipediaの取得とメタデータ抽出を自動的に処理します。呼び出し側はタグ名のみを渡せば、Wikipedia情報とメタデータを含んだAI生成コンテンツが返されます。

## 設計方針

### インターフェースの単純化

AI サービスのインターフェースをタグ名のみを受け取る形に単純化しました：

```typescript
// 外部から呼び出す際のインターフェース
aiService.generateTagContentFromName(tagName: string)
  -> Promise<{ content: string; wikipediaUrl: string }>
```

この設計により：
- **情報源をAIサービス内部に隠蔽**: Wikipedia利用の詳細は外部に露出しない
- **単純な呼び出し**: タグ名を渡すだけで完結
- **柔軟性**: 将来的に他の情報源を追加する場合も、インターフェースを変更する必要がない

## 実装内容

### 1. AiServiceの内部処理フロー

`generateTagContentFromName(tagName)` メソッドは以下を自動的に処理します：

1. **Wikipedia取得**: タグ名からWikipedia HTML APIを呼び出し
2. **メタデータ抽出**: HTMLから公式サイトや関連リンクを抽出
3. **AI生成**: 抽出した情報をAIプロンプトに含めてコンテンツ生成
4. **フォーマット**: 生成結果をMarkdown形式に整形

### 2. メタデータ抽出機能

Wikipedia HTMLから以下の情報を自動抽出します：

- **公式サイト**: class="external"を持つリンクの中から、「公式」「オフィシャル」「Official」を含むものを抽出
- **関連リンク**: 外部リンクを最大10個まで収集（URL + タイトル）

抽出したメタデータはAI指示プロンプトに自動的に含まれ、AIが「### 参考リンク」セクションを生成できるようにします。

### 3. TagServiceの簡潔化

TagServiceは単純にタグ名をAIサービスに渡すだけで、Wikipedia取得やメタデータ抽出の詳細を知る必要がありません：

```typescript
// TagService内での呼び出し
private async getAiEnhancedSummary(tagName: string) {
  const result = await this.aiService.generateTagContentFromName(tagName);
  return {
    content: result.content,
    support_type: 'ai_enhanced'
  };
}
```

## API使用例

外部APIのインターフェースは変更されていません：

```bash
POST /api/support/tags
Content-Type: application/json
Cookie: session=<session_token>

{
  "tag_name": "進撃の巨人",
  "support_type": "ai_enhanced"
}
```

レスポンス（メタデータが自動的に含まれる）:
```json
{
  "content": "<!-- AI生成コンテンツ開始 -->\n\n...(AI生成コンテンツ)...\n\n### 参考リンク\n- [公式サイト](https://example.com/official)\n- [関連情報](https://example.com/info)\n\n<!-- AI生成コンテンツ終了 -->\n\n出典: [Wikipedia](<https://ja.wikipedia.org/wiki/進撃の巨人>)",
  "support_type": "ai_enhanced"
}
```

## サポートタイプ

以下の2つのサポートタイプが利用可能です：

- `wikipedia_summary`: Wikipedia APIのサマリーを使用（メタデータなし）
- `ai_enhanced`: AIによる拡張生成（**メタデータを自動的に含む**）

## 技術仕様

### 内部インターフェース（ExtractedMetadata）

```typescript
interface ExtractedMetadata {
  officialSites: string[];  // 公式サイトのURL一覧
  relatedLinks: {           // 関連リンク
    url: string;
    title: string;
  }[];
}
```

このインターフェースはAiService内部でのみ使用され、外部には公開されません。

### メタデータ抽出ロジック

1. Wikipedia HTMLをDOMパース（dominoライブラリ使用）
2. `a.external`セレクタで外部リンクを検索
3. リンクテキストまたはURLに「公式」「Official」などを含むものを公式サイトとして分類
4. すべての外部リンクを関連リンクとして収集（重複除去、最大10件）

### 旧インターフェースの非推奨化

以前の`generateEnhancedTagContent(input: AiEnhancedTagInput)`メソッドは`@deprecated`マークを付けて残していますが、新しいコードでは使用すべきではありません。

## テスト

以下のテストを実装しました：

- **単体テスト** (`AiService.test.ts`):
  - `generateTagContentFromName`: Wikipedia取得からAI生成までの統合テスト
  - Wikipedia取得エラーのハンドリング
  - メタデータ抽出機能の各種テストケース

- **統合テスト** (`tag-support.test.ts`):
  - `ai_enhanced`サポートタイプのエンドポイント検証
  - メタデータが自動的に含まれることの確認

全287テストが成功しています。

## 設計の利点

1. **カプセル化**: Wikipedia取得とメタデータ抽出の詳細をAIサービス内部に隠蔽
2. **単純なインターフェース**: タグ名のみを渡すだけで完結
3. **保守性**: 将来的に情報源を変更・追加する場合も、外部インターフェースを変更する必要がない
4. **テスト容易性**: AI サービスの単体テストで全体の動作を検証可能

