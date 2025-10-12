# 005-content-links: コンテンツアクセスリンク機能

## 概要

ログやタグに関連する外部コンテンツ（公式サイト、Wikipedia、購入URL、ストリーミングサービス等）へのリンクを提供する機能の設計。

## 背景

現在のShumilogでは、タグに`metadata`フィールドが存在するものの、外部コンテンツへのリンクは体系的に管理・表示されていません。ユーザーが趣味コンテンツについてもっと知りたい、または実際にコンテンツを購入・視聴したい場合、自分で検索する必要があります。

この機能により、ユーザーは：
- タグやログから直接、公式サイトや情報源にアクセスできる
- 複数の購入・視聴オプションから選択できる
- コンテンツに関する詳細情報を簡単に得られる

## ドキュメント構成

| ファイル | 説明 |
|---------|------|
| [spec.md](./spec.md) | **機能仕様書** - 要件、ユーザーストーリー、KPI等の概要 |
| [design.md](./design.md) | **詳細設計書** - データモデル、UI設計、実装計画の詳細 |
| [architecture.md](./architecture.md) | **アーキテクチャ図** - システム構成、データフロー、影響範囲 |
| [data-model.md](./data-model.md) | **データモデル** - メタデータ構造、バリデーション、例 |
| [research.md](./research.md) | **調査・研究** - 技術調査、設計判断、参考事例 |
| [quickstart.md](./quickstart.md) | **クイックスタート** - 使用方法、サンプルコード、トラブルシューティング |

## 主要な設計判断

### 1. タグのメタデータを活用

- **決定**: 既存の`tags.metadata`（JSON）フィールドに`links`オブジェクトを追加
- **理由**: スキーマ変更不要、実装が簡単、既存APIと完全互換
- **代替案**: 専用のリンクテーブルを作成（過剰な設計と判断）

### 2. 段階的実装

- **Phase 1**: タグのメタデータのみ拡張（必須）
- **Phase 2**: ログのメタデータ対応（任意）
- **理由**: リスクを最小化し、早期に価値を提供

### 3. リンクタイプの標準化

- **決定**: 一般的なサービス（Netflix、Amazon、Steam等）を定義済みタイプとして提供
- **追加**: カスタムリンクで柔軟性を確保
- **理由**: ユーザビリティ向上とメンテナンス性のバランス

### 4. UI/UXアプローチ

- **決定**: Emojiアイコン + テキストラベル + shadcn/ui Button
- **理由**: 追加ライブラリ不要、分かりやすい、軽量
- **代替案**: Font Icon（追加のライブラリが必要）、サービスロゴ（ライセンス問題）

## サポートするリンクタイプ

### 公式・情報サイト
- 🌐 公式サイト (official)
- 📖 Wikipedia (wikipedia)
- Wikidata ID (wikidataId)

### 購入サイト
- 🛒 Amazon (amazon)
- 🛒 楽天市場 (rakuten)

### ストリーミング（動画）
- 📺 Netflix (netflix)
- 📺 Prime Video (amazonPrime)
- 📺 Crunchyroll (crunchyroll)

### ストリーミング（音楽）
- 🎵 Spotify (spotify)
- 🎵 Apple Music (appleMusic)
- ▶️ YouTube (youtube)

### ゲームストア
- 🎮 Steam (steam)
- 🎮 PlayStation Store (playstationStore)
- 🎮 Nintendo eShop (nintendoEshop)

### コミュニティ・データベース
- 📊 MyAnimeList (myanimelist)
- 📊 AniList (anilist)

### カスタムリンク
- 🔗 ユーザー定義 (custom)

## 使用例

### タグにリンクを追加

```json
{
  "name": "Attack on Titan",
  "metadata": {
    "category": "anime",
    "year": 2013,
    "links": {
      "official": "https://shingeki.tv/",
      "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人",
      "myanimelist": "https://myanimelist.net/anime/16498/",
      "crunchyroll": "https://www.crunchyroll.com/series/GR751KNZY/",
      "netflix": "https://www.netflix.com/title/70299043"
    }
  }
}
```

### UIでの表示

タグ詳細ページ:
```
🔗 関連リンク
[🌐 公式サイト] [📖 Wikipedia] [📊 MyAnimeList]
[📺 Crunchyroll] [📺 Netflix]
```

## セキュリティ

- ✅ URLバリデーション（`http:`/`https:`のみ許可）
- ✅ 危険なスキーム拒否（`javascript:`, `data:`等）
- ✅ 外部リンク属性（`rel="noopener noreferrer"`）
- ✅ 新しいタブで開く（`target="_blank"`）

## 実装状況

- [x] 設計完了
- [ ] シードデータ更新
- [ ] UIコンポーネント実装
- [ ] タグ詳細ページ統合
- [ ] ログ詳細ページ統合
- [ ] テスト作成
- [ ] ドキュメント更新

## 次のステップ

1. シードデータを更新し、具体的なリンク例を追加
2. `ContentLinks.tsx`コンポーネントを実装
3. タグ詳細ページに統合
4. ログ詳細ページに統合
5. テストを作成
6. ユーザーフィードバックを収集

## 関連Issue

- Issue: ログやタグに関連するコンテンツにアクセス出来るようにするための設計

## コントリビューター

- GitHub Copilot (設計)

---

**作成日**: 2025-10-12  
**バージョン**: 1.0.0
