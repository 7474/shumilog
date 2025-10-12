# コンテンツアクセスリンク機能 - 実装サマリー

このドキュメントは、実装者が素早く全体像を把握できるように設計の要点をまとめたものです。

## 🎯 目的

ユーザーがタグやログから直接、関連する外部コンテンツ（公式サイト、Wikipedia、購入/視聴ページ等）にアクセスできるようにする。

## 📋 実装チェックリスト

### Phase 1: 基本実装（必須）

- [ ] **データモデル**
  - [ ] `TagModel`に`isValidMetadata()`メソッド追加
  - [ ] `TagModel`に`isValidUrl()`メソッド追加
  - [ ] URLバリデーションのテスト作成

- [ ] **シードデータ**
  - [ ] `backend/src/db/seeds.sql`を更新
  - [ ] Attack on Titan等にリンク情報を追加
  - [ ] 各カテゴリ（アニメ、ゲーム、音楽）の代表例を用意

- [ ] **フロントエンド**
  - [ ] `ContentLinks.tsx`コンポーネント作成
  - [ ] リンクアイコンマッピング定義
  - [ ] `TagDetailPage.tsx`に統合
  - [ ] `LogDetailPage.tsx`に統合

- [ ] **テスト**
  - [ ] バリデーションのユニットテスト
  - [ ] UIコンポーネントのテスト
  - [ ] 手動テスト（各種リンクの動作確認）

- [ ] **ドキュメント**
  - [x] 設計ドキュメント完成
  - [ ] README更新（機能の説明追加）

## 🏗️ 実装の概要

### 1. データ構造

既存の`tags.metadata`（JSON）フィールドに`links`オブジェクトを追加：

```typescript
interface TagMetadata {
  category?: string;
  year?: number;
  links?: {
    official?: string;        // 公式サイト
    wikipedia?: string;       // Wikipedia
    amazon?: string;          // Amazon
    netflix?: string;         // Netflix
    spotify?: string;         // Spotify
    steam?: string;           // Steam
    myanimelist?: string;     // MyAnimeList
    custom?: Array<{          // カスタムリンク
      name: string;
      url: string;
      icon?: string;
    }>;
  };
}
```

### 2. バリデーション実装

`backend/src/models/Tag.ts`に追加：

```typescript
export class TagModel {
  static isValidMetadata(metadata: any): boolean {
    // メタデータの検証ロジック
    // - リンクのURL形式チェック
    // - 危険なスキーム拒否
    // - サイズ制限（64KB）
  }

  private static isValidUrl(url: string): boolean {
    // URLの検証ロジック
    // - http/https のみ許可
    // - javascript:, data: 等を拒否
  }
}
```

### 3. UIコンポーネント

`frontend/src/components/ContentLinks.tsx`を新規作成：

```tsx
interface ContentLinksProps {
  links: Record<string, string | CustomLink[]>;
}

export function ContentLinks({ links }: ContentLinksProps) {
  // リンクをボタンとして表示
  // - Emojiアイコン
  // - テキストラベル
  // - ExternalLinkアイコン
  // - target="_blank" rel="noopener noreferrer"
}
```

### 4. ページ統合

**TagDetailPage.tsx**:
```tsx
{tag.metadata?.links && (
  <ContentLinks links={tag.metadata.links} />
)}
```

**LogDetailPage.tsx**:
```tsx
// タグのリンクを集約して表示
const allLinks = log.associated_tags
  .flatMap(tag => tag.metadata?.links || [])
  .reduce(...); // 重複除去
  
<ContentLinks links={allLinks} />
```

## 🔐 セキュリティ要件

| 要件 | 実装方法 |
|------|---------|
| XSS対策 | `javascript:`等のスキーム拒否 |
| オープンリダイレクト対策 | `http:`/`https:`のみ許可 |
| タブナビング対策 | `rel="noopener noreferrer"` |
| 外部サイト表示 | `target="_blank"` |

## 🎨 リンクタイプ一覧

| タイプ | アイコン | ラベル | 用途 |
|--------|---------|--------|------|
| official | 🌐 | 公式サイト | 作品の公式ウェブサイト |
| wikipedia | 📖 | Wikipedia | 作品の詳細情報 |
| amazon | 🛒 | Amazon | 購入ページ |
| rakuten | 🛒 | 楽天市場 | 購入ページ |
| netflix | 📺 | Netflix | 視聴ページ（動画） |
| amazonPrime | 📺 | Prime Video | 視聴ページ（動画） |
| crunchyroll | 📺 | Crunchyroll | 視聴ページ（アニメ） |
| spotify | 🎵 | Spotify | 視聴ページ（音楽） |
| appleMusic | 🎵 | Apple Music | 視聴ページ（音楽） |
| youtube | ▶️ | YouTube | 視聴ページ（動画/音楽） |
| steam | 🎮 | Steam | 購入ページ（ゲーム） |
| playstationStore | 🎮 | PlayStation Store | 購入ページ（ゲーム） |
| nintendoEshop | 🎮 | Nintendo eShop | 購入ページ（ゲーム） |
| myanimelist | 📊 | MyAnimeList | コミュニティ・DB |
| anilist | 📊 | AniList | コミュニティ・DB |
| custom | 🔗 | (カスタム) | ユーザー定義 |

## 📝 シードデータ例

```sql
UPDATE tags SET metadata = json('{
  "category": "anime",
  "year": 2013,
  "studio": "Studio WIT",
  "links": {
    "official": "https://shingeki.tv/",
    "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人_(アニメ)",
    "myanimelist": "https://myanimelist.net/anime/16498/",
    "crunchyroll": "https://www.crunchyroll.com/series/GR751KNZY/",
    "netflix": "https://www.netflix.com/title/70299043"
  }
}') WHERE name = 'Attack on Titan';
```

## 🧪 テストケース

### バリデーションテスト

```typescript
// 有効なURL
expect(TagModel.isValidUrl('https://example.com')).toBe(true);
expect(TagModel.isValidUrl('http://example.com')).toBe(true);

// 無効なURL
expect(TagModel.isValidUrl('javascript:alert(1)')).toBe(false);
expect(TagModel.isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
expect(TagModel.isValidUrl('not-a-url')).toBe(false);
```

### UIテスト

```typescript
// リンクが表示される
const links = { official: 'https://example.com' };
render(<ContentLinks links={links} />);
expect(screen.getByText('公式サイト')).toBeInTheDocument();

// 新しいタブで開く
const link = screen.getByRole('link');
expect(link).toHaveAttribute('target', '_blank');
expect(link).toHaveAttribute('rel', 'noopener noreferrer');
```

## 📂 ファイル変更箇所

```
backend/
├─ src/
│  ├─ models/Tag.ts                  [変更] バリデーション追加
│  └─ db/seeds.sql                   [変更] リンク情報追加
│
frontend/
├─ src/
│  ├─ components/
│  │  └─ ContentLinks.tsx            [新規] リンク表示コンポーネント
│  └─ pages/
│     ├─ TagDetailPage.tsx           [変更] ContentLinks統合
│     └─ LogDetailPage.tsx           [変更] ContentLinks統合
│
specs/
└─ 005-content-links/                [新規] 設計ドキュメント
```

## 🚀 実装の流れ

1. **バックエンド** (1-2日)
   - [ ] `Tag.ts`にバリデーション追加
   - [ ] `seeds.sql`更新
   - [ ] テスト作成・実行

2. **フロントエンド** (2-3日)
   - [ ] `ContentLinks.tsx`作成
   - [ ] `TagDetailPage.tsx`統合
   - [ ] `LogDetailPage.tsx`統合
   - [ ] スタイル調整

3. **テスト・検証** (1日)
   - [ ] ユニットテスト実行
   - [ ] 手動テスト（各種リンク）
   - [ ] レスポンシブ確認

4. **ドキュメント** (半日)
   - [ ] README更新
   - [ ] コメント追加

**合計見積もり**: 4-6日

## ❓ FAQ

### Q1: 既存のAPIは変更が必要？

**A**: いいえ。既存の`POST /tags`、`PUT /tags/{id}`、`GET /tags/{id}`をそのまま使用できます。`metadata`フィールドに`links`を含めるだけです。

### Q2: ログにもリンクを追加できる？

**A**: Phase 1ではタグのリンクのみ対応します。Phase 2でログテーブルに`metadata`カラムを追加し、ログ固有のリンクをサポートする予定です。

### Q3: カスタムリンクの数に制限は？

**A**: `metadata`全体で64KB以内であれば制限はありませんが、UI的には10個程度が推奨です。

### Q4: リンクのクリック数は記録される？

**A**: Phase 1では記録しません。Phase 2でリンク分析機能として実装予定です。

### Q5: サービスのロゴを使用できる？

**A**: Phase 1ではEmojiアイコンを使用します。公式ロゴの使用はライセンス確認が必要なため、Phase 2以降で検討します。

## 📚 参考資料

- [詳細設計書](./design.md) - 完全な設計情報
- [アーキテクチャ図](./architecture.md) - システム構成とデータフロー
- [データモデル](./data-model.md) - メタデータ構造の詳細
- [クイックスタート](./quickstart.md) - 使用方法とサンプル

## 📞 サポート

質問や提案がある場合は、GitHubのissueを作成してください。

---

**最終更新**: 2025-10-12  
**バージョン**: 1.0.0  
**ステータス**: 設計完了、実装準備完了
