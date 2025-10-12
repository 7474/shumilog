# コンテンツリンク機能 - クイックスタート

## 概要

タグに外部コンテンツへのリンク（公式サイト、Wikipedia、購入URL等）を追加し、UIで表示する機能。

## 前提条件

- Node.js 22 LTS
- バックエンドとフロントエンドの依存関係がインストール済み
- ローカルD1データベースが初期化済み

## セットアップ

### 1. 依存関係のインストール

```bash
cd /path/to/shumilog
cd backend && npm install
cd ../frontend && npm install
```

### 2. データベースの準備

```bash
cd backend
npm run db:migrate
npm run db:seed
```

## 使用例

### シナリオ 1: タグにリンクを追加する

#### 1.1 タグ作成時にリンクを含める

**APIリクエスト例**:

```bash
curl -X POST http://localhost:8787/api/tags \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<session_token>" \
  -d '{
    "name": "Demon Slayer",
    "description": "人気のアニメ・マンガシリーズ #Anime #Shonen",
    "metadata": {
      "category": "anime",
      "year": 2019,
      "studio": "ufotable",
      "episodes": 26,
      "links": {
        "official": "https://kimetsu.com/",
        "wikipedia": "https://ja.wikipedia.org/wiki/鬼滅の刃",
        "myanimelist": "https://myanimelist.net/anime/38000/",
        "crunchyroll": "https://www.crunchyroll.com/demon-slayer-kimetsu-no-yaiba",
        "netflix": "https://www.netflix.com/title/81091393",
        "amazon": "https://www.amazon.co.jp/dp/B07Z2L91R4"
      }
    }
  }'
```

#### 1.2 既存タグを更新してリンクを追加

**APIリクエスト例**:

```bash
curl -X PUT http://localhost:8787/api/tags/Anime \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<session_token>" \
  -d '{
    "metadata": {
      "category": "media",
      "links": {
        "wikipedia": "https://ja.wikipedia.org/wiki/アニメ",
        "myanimelist": "https://myanimelist.net/"
      }
    }
  }'
```

### シナリオ 2: UIでリンクを確認する

#### 2.1 タグ詳細ページでリンクを表示

1. ブラウザでフロントエンドにアクセス: http://localhost:5173
2. 「Tags」メニューをクリック
3. 「Demon Slayer」タグをクリック
4. タグ詳細ページで「🔗 関連リンク」セクションを確認

**表示されるリンク例**:
- 🌐 公式サイト
- 📖 Wikipedia
- 📊 MyAnimeList
- 📺 Crunchyroll
- 📺 Netflix
- 🛒 Amazon

#### 2.2 ログ詳細ページでタグのリンクを表示

1. 特定のログをクリック
2. ログに紐づくタグのリンクが「🔗 関連リンク」セクションに表示される

### シナリオ 3: 様々なコンテンツタイプのリンク

#### 3.1 ゲームタグの例

```json
{
  "name": "Elden Ring",
  "description": "FromSoftwareのアクションRPG #Gaming #RPG",
  "metadata": {
    "category": "game",
    "year": 2022,
    "genre": "Action RPG",
    "links": {
      "official": "https://en.bandainamcoent.eu/elden-ring/elden-ring",
      "wikipedia": "https://ja.wikipedia.org/wiki/エルデンリング",
      "steam": "https://store.steampowered.com/app/1245620/ELDEN_RING/",
      "playstationStore": "https://store.playstation.com/ja-jp/product/JP0700-PPSA09157_00-ELDENRING0000000",
      "amazon": "https://www.amazon.co.jp/dp/B09NPCT26J"
    }
  }
}
```

**表示されるリンク**:
- 🌐 公式サイト
- 📖 Wikipedia
- 🎮 Steam
- 🎮 PlayStation Store
- 🛒 Amazon

#### 3.2 音楽タグの例

```json
{
  "name": "YOASOBI",
  "description": "日本の音楽ユニット #J-POP #Music",
  "metadata": {
    "category": "music",
    "year": 2019,
    "genre": "J-POP",
    "links": {
      "official": "https://www.yoasobi-music.jp/",
      "wikipedia": "https://ja.wikipedia.org/wiki/YOASOBI",
      "spotify": "https://open.spotify.com/artist/64tJ2EAv1R6UaZqc4iOCyj",
      "appleMusic": "https://music.apple.com/jp/artist/yoasobi/1473757338",
      "youtube": "https://www.youtube.com/@YOASOBI_OFFICIAL"
    }
  }
}
```

**表示されるリンク**:
- 🌐 公式サイト
- 📖 Wikipedia
- 🎵 Spotify
- 🎵 Apple Music
- ▶️ YouTube

#### 3.3 カスタムリンクの例

```json
{
  "name": "Attack on Titan",
  "description": "進撃の巨人 #Anime #Manga #Shonen",
  "metadata": {
    "category": "anime",
    "links": {
      "official": "https://shingeki.tv/",
      "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人",
      "custom": [
        {
          "name": "進撃の巨人 Wiki",
          "url": "https://attackontitan.fandom.com/wiki/Attack_on_Titan_Wiki",
          "icon": "📚",
          "description": "ファンによる詳細なWiki"
        },
        {
          "name": "公式Twitter",
          "url": "https://twitter.com/anime_shingeki",
          "icon": "🐦"
        }
      ]
    }
  }
}
```

**表示されるリンク**:
- 🌐 公式サイト
- 📖 Wikipedia
- 📚 進撃の巨人 Wiki
- 🐦 公式Twitter

## シードデータの例

以下のコマンドでシードデータを更新し、リンク情報を含むタグを作成できます：

```bash
cd backend
npm run db:seed
```

シードデータには以下のリンク付きタグが含まれます：

1. **Attack on Titan** - アニメ・マンガシリーズ
   - 公式サイト、Wikipedia、MyAnimeList、Crunchyroll、Netflix、Amazon

2. **Anime** - カテゴリタグ
   - Wikipedia、MyAnimeList

3. **Gaming** - カテゴリタグ
   - Wikipedia、Steam（代表例としてElden Ring）

## トラブルシューティング

### リンクが表示されない

**原因**: メタデータに`links`フィールドが含まれていない

**解決方法**:
1. タグのメタデータを確認:
   ```bash
   curl http://localhost:8787/api/tags/TagName
   ```
2. メタデータに`metadata.links`が含まれているか確認
3. 含まれていない場合は、タグを更新してリンクを追加

### リンクをクリックしても何も起こらない

**原因**: 不正なURL形式

**解決方法**:
1. URLが`http://`または`https://`で始まるか確認
2. URLバリデーションエラーがないか確認
3. ブラウザのコンソールでエラーを確認

### カスタムリンクが表示されない

**原因**: カスタムリンクの形式が正しくない

**解決方法**:
カスタムリンクは以下の形式で配列として指定する必要があります：

```json
{
  "links": {
    "custom": [
      {
        "name": "リンク名",
        "url": "https://example.com",
        "icon": "🔗"
      }
    ]
  }
}
```

## テスト方法

### ユニットテスト

```bash
cd backend
npm run test
```

### 統合テスト

```bash
cd backend
npm run test:contract
```

### 手動テスト

1. **タグ作成テスト**:
   - 管理者ユーザーでログイン
   - 新しいタグを作成し、リンクを追加
   - タグ詳細ページでリンクが表示されることを確認

2. **リンクアクセステスト**:
   - 各リンクをクリック
   - 新しいタブで正しいURLが開くことを確認

3. **レスポンシブテスト**:
   - モバイル画面でリンクが適切に表示されることを確認
   - タブレット画面でリンクが適切に表示されることを確認

## 次のステップ

1. **タグ編集フォームの改善** - UIからリンクを追加・編集できるようにする
2. **リンクプレビュー** - Open Graph APIを使用してリンクのプレビューを表示
3. **ログのメタデータ対応** - ログ固有のリンクを保存できるようにする
4. **自動リンク生成** - タグ名から自動的にWikipedia URLを生成

## 参考情報

- [設計ドキュメント](./design.md) - 詳細な設計情報
- [データモデル](./data-model.md) - メタデータの構造
- [調査・研究](./research.md) - 技術的な調査結果
- [OpenAPI仕様](../../api/v1/openapi.yaml) - API仕様書

## フィードバック

この機能に関する質問や提案がある場合は、GitHubのissueを作成してください。
