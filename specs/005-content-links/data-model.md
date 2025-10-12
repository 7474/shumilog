# コンテンツリンク機能 - データモデル

## 概要

タグとログのメタデータを拡張し、外部コンテンツへのリンク情報を格納する。

## データ構造

### 1. タグのメタデータ (tags.metadata)

既存の`tags`テーブルの`metadata`カラム（TEXT型、JSON文字列）を使用。

#### スキーマ定義

```typescript
interface TagMetadata {
  // コンテンツ基本情報
  category?: string;                    // コンテンツカテゴリ: "anime", "manga", "game", "music", etc.
  year?: number;                        // 制作年・発売年
  studio?: string;                      // 制作会社（アニメ・ゲーム）
  author?: string;                      // 作者（マンガ・小説）
  artist?: string;                      // アーティスト（音楽）
  genre?: string;                       // ジャンル
  episodes?: number;                    // エピソード数（アニメ）
  volumes?: number;                     // 巻数（マンガ・小説）
  
  // リンク情報
  links?: TagLinks;
  
  // 拡張用
  [key: string]: any;
}

interface TagLinks {
  // 公式・情報サイト
  official?: string;                    // 公式サイト
  wikipedia?: string;                   // Wikipedia URL
  wikidataId?: string;                  // Wikidata ID (例: "Q123456")
  
  // ECサイト（購入）
  amazon?: string;                      // Amazon商品ページ
  amazonJp?: string;                    // Amazon.co.jp
  rakuten?: string;                     // 楽天市場
  
  // 動画ストリーミング
  netflix?: string;                     // Netflix
  amazonPrime?: string;                 // Amazon Prime Video
  disneyPlus?: string;                  // Disney+
  hulu?: string;                        // Hulu
  crunchyroll?: string;                 // Crunchyroll（アニメ）
  funimation?: string;                  // Funimation（アニメ）
  
  // 音楽ストリーミング
  spotify?: string;                     // Spotify
  appleMusic?: string;                  // Apple Music
  youtube?: string;                     // YouTube
  youtubeMusic?: string;                // YouTube Music
  
  // ゲームストア
  steam?: string;                       // Steam
  epicGames?: string;                   // Epic Games Store
  gog?: string;                         // GOG.com
  nintendoEshop?: string;               // Nintendo eShop
  playstationStore?: string;            // PlayStation Store
  xboxStore?: string;                   // Xbox Store
  
  // コミュニティ・データベース
  myanimelist?: string;                 // MyAnimeList
  anilist?: string;                     // AniList
  anidb?: string;                       // AniDB
  vndb?: string;                        // Visual Novel Database
  mobygames?: string;                   // MobyGames
  
  // SNS・コミュニティ
  twitter?: string;                     // 公式Twitter
  reddit?: string;                      // Reddit コミュニティ
  discord?: string;                     // Discord サーバー
  
  // カスタムリンク
  custom?: CustomLink[];
}

interface CustomLink {
  name: string;                         // リンク名
  url: string;                          // URL
  icon?: string;                        // アイコン（emoji or アイコン名）
  description?: string;                 // 説明（オプション）
}
```

#### JSON例

```json
{
  "category": "anime",
  "year": 2013,
  "studio": "Studio WIT",
  "episodes": 25,
  "genre": "Action, Dark Fantasy",
  "links": {
    "official": "https://shingeki.tv/",
    "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人_(アニメ)",
    "wikidataId": "Q1139058",
    "myanimelist": "https://myanimelist.net/anime/16498/Shingeki_no_Kyojin",
    "anilist": "https://anilist.co/anime/16498/",
    "crunchyroll": "https://www.crunchyroll.com/series/GR751KNZY/attack-on-titan",
    "netflix": "https://www.netflix.com/title/70299043",
    "amazonPrime": "https://www.amazon.co.jp/dp/B00F3S9TXE",
    "twitter": "https://twitter.com/anime_shingeki",
    "custom": [
      {
        "name": "進撃の巨人 Wiki",
        "url": "https://attackontitan.fandom.com/wiki/Attack_on_Titan_Wiki",
        "icon": "📚"
      }
    ]
  }
}
```

### 2. ログのメタデータ (logs.metadata) - 将来の拡張

**現在のスキーマ**: `logs`テーブルには`metadata`カラムが存在しない

#### Option A: ログテーブルを拡張（将来）

```sql
-- マイグレーション（将来的に実施）
ALTER TABLE logs ADD COLUMN metadata TEXT DEFAULT '{}';
```

この場合、ログごとに独自のリンクを持つことが可能：

```typescript
interface LogMetadata {
  // ログ固有の情報
  episode?: number;                     // エピソード番号
  chapter?: number;                     // 章番号
  playtime?: number;                    // プレイ時間（分）
  
  // ログ固有のリンク
  links?: {
    screenshot?: string;                // スクリーンショット
    clip?: string;                      // 動画クリップ
    custom?: CustomLink[];
  };
  
  [key: string]: any;
}
```

#### Option B: タグのメタデータを参照（現在の推奨）

- ログに紐づくタグの`metadata.links`を集約して表示
- テーブル変更不要
- 実装が簡潔

## データ検証

### バリデーションルール

1. **URL形式チェック**
   - 有効なURL形式であること
   - HTTPSを推奨（HTTPも許可）
   - `javascript:`等の危険なスキームを拒否

2. **文字列長制限**
   - URL: 最大2048文字
   - カスタムリンク名: 最大100文字
   - カスタムリンク説明: 最大500文字

3. **JSON全体サイズ**
   - `metadata`全体: 最大64KB（D1の制約）

### バリデーション実装例

```typescript
export class TagModel {
  static isValidMetadata(metadata: any): boolean {
    if (typeof metadata !== 'object' || metadata === null) {
      return false;
    }

    // メタデータ全体のサイズチェック
    const jsonStr = JSON.stringify(metadata);
    if (jsonStr.length > 65536) {
      return false;
    }

    // リンク情報がある場合
    if (metadata.links) {
      if (typeof metadata.links !== 'object') {
        return false;
      }

      for (const [key, value] of Object.entries(metadata.links)) {
        if (key === 'custom') {
          // カスタムリンク配列のバリデーション
          if (!Array.isArray(value)) return false;
          for (const link of value as any[]) {
            if (!link.name || !link.url) return false;
            if (link.name.length > 100) return false;
            if (link.description && link.description.length > 500) return false;
            if (!isValidUrl(link.url)) return false;
          }
        } else if (value !== null && value !== undefined) {
          // 単一URLのバリデーション
          if (typeof value !== 'string') return false;
          if (value.length > 2048) return false;
          if (!isValidUrl(value as string)) return false;
        }
      }
    }

    return true;
  }

  private static isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // 危険なスキームを拒否
      const dangerousSchemes = ['javascript', 'data', 'vbscript'];
      if (dangerousSchemes.includes(parsedUrl.protocol.replace(':', ''))) {
        return false;
      }
      
      // http/https のみ許可
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}
```

## データ移行

### 既存データの更新

既存のタグにリンク情報を追加する場合のマイグレーション例：

```sql
-- シードデータを更新（例）
UPDATE tags 
SET metadata = json('{
  "category": "anime",
  "year": 2013,
  "studio": "Studio WIT",
  "episodes": 25,
  "links": {
    "official": "https://shingeki.tv/",
    "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人_(アニメ)",
    "myanimelist": "https://myanimelist.net/anime/16498/Shingeki_no_Kyojin",
    "crunchyroll": "https://www.crunchyroll.com/series/GR751KNZY/attack-on-titan",
    "netflix": "https://www.netflix.com/title/70299043"
  }
}')
WHERE name = 'Attack on Titan';

-- 他のタグも同様に更新
UPDATE tags 
SET metadata = json_patch(metadata, '{
  "links": {
    "wikipedia": "https://ja.wikipedia.org/wiki/アニメ"
  }
}')
WHERE name = 'Anime';
```

## インデックス戦略

現在のスキーマでは、`metadata`フィールドに対する直接的なインデックスは不要：

- リンク情報はタグの詳細表示時のみ使用
- 検索や集計には使用しない
- JSON部分抽出は使用頻度が低いためインデックス不要

将来的に、特定のリンクタイプで検索する必要が生じた場合：

```sql
-- JSON部分抽出インデックス（必要に応じて）
CREATE INDEX idx_tags_has_official_link 
ON tags((json_extract(metadata, '$.links.official') IS NOT NULL));
```

## データ例

### アニメ作品

```json
{
  "category": "anime",
  "year": 2020,
  "studio": "ufotable",
  "episodes": 26,
  "genre": "Action, Supernatural",
  "links": {
    "official": "https://kimetsu.com/",
    "wikipedia": "https://ja.wikipedia.org/wiki/鬼滅の刃",
    "myanimelist": "https://myanimelist.net/anime/38000/",
    "crunchyroll": "https://www.crunchyroll.com/demon-slayer-kimetsu-no-yaiba",
    "netflix": "https://www.netflix.com/title/81091393",
    "twitter": "https://twitter.com/kimetsu_off"
  }
}
```

### ゲーム

```json
{
  "category": "game",
  "year": 2022,
  "genre": "Action RPG",
  "links": {
    "official": "https://en.bandainamcoent.eu/elden-ring/elden-ring",
    "wikipedia": "https://ja.wikipedia.org/wiki/エルデンリング",
    "steam": "https://store.steampowered.com/app/1245620/ELDEN_RING/",
    "playstationStore": "https://store.playstation.com/ja-jp/product/JP0700-PPSA09157_00-ELDENRING0000000",
    "amazon": "https://www.amazon.co.jp/dp/B09NPCT26J",
    "twitter": "https://twitter.com/ELDENRING"
  }
}
```

### 音楽

```json
{
  "category": "music",
  "artist": "YOASOBI",
  "year": 2023,
  "genre": "J-POP",
  "links": {
    "official": "https://www.yoasobi-music.jp/",
    "wikipedia": "https://ja.wikipedia.org/wiki/YOASOBI",
    "spotify": "https://open.spotify.com/artist/64tJ2EAv1R6UaZqc4iOCyj",
    "appleMusic": "https://music.apple.com/jp/artist/yoasobi/1473757338",
    "youtube": "https://www.youtube.com/@YOASOBI_OFFICIAL",
    "twitter": "https://twitter.com/YOASOBI_staff"
  }
}
```

### マンガ

```json
{
  "category": "manga",
  "author": "諫山創",
  "year": 2009,
  "volumes": 34,
  "genre": "Shonen, Action",
  "links": {
    "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人",
    "myanimelist": "https://myanimelist.net/manga/23390/",
    "amazon": "https://www.amazon.co.jp/dp/B00MXVHWYM",
    "rakuten": "https://books.rakuten.co.jp/rb/12345678/"
  }
}
```

## まとめ

このデータモデルにより：

✅ **柔軟性**: 様々なコンテンツタイプに対応  
✅ **拡張性**: 新しいリンクタイプの追加が容易  
✅ **互換性**: 既存のスキーマを変更せずに実装可能  
✅ **バリデーション**: セキュリティを考慮したURL検証  
✅ **段階的移行**: タグのメタデータから開始し、必要に応じてログにも拡張  

この設計により、ユーザーは趣味コンテンツに関する豊富なリンク情報にアクセスできるようになります。
