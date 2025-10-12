# コンテンツアクセスリンク機能設計書

## 概要

ログやタグに関連するコンテンツ（公式サイト、Wikipedia、購入URL、オンラインコンテンツ等）へのアクセスを可能にする機能の設計。

## 目的

- 趣味コンテンツに関する情報収集を容易にする
- 公式ページや購入ページへの導線を提供する
- ユーザーが実際にコンテンツに触れられるようにする
- メタデータの柔軟性を活かした拡張性の高い設計

## 要件

### 必須要件

1. **公式サイトへのリンク**: 作品の公式ウェブサイトへのリンク
2. **Wikipedia等の情報源**: コンテンツの詳細情報が得られるリンク
3. **購入・視聴URL**: 商品の購入やオンラインコンテンツへのアクセスリンク
4. **UIでの適切な表示**: リンクの種類が分かりやすく表示される
5. **既存データモデルとの互換性**: 現在の`metadata`フィールドを活用

### 任意要件

1. **複数プラットフォーム対応**: Amazon、楽天、Netflix、Crunchyroll等の複数サービス
2. **リンクアイコン**: 各サービスに対応したアイコン表示
3. **リンク検証**: 無効なURLの検出
4. **ログへのメタデータ追加**: タグだけでなくログにもメタデータを持たせる

## 設計アプローチ

### 1. データモデル設計

#### 1.1 タグのメタデータ構造

既存の`tags.metadata`（JSON）フィールドを活用し、以下の構造を定義：

```typescript
interface TagMetadata {
  // 基本情報
  category?: string;           // "anime", "manga", "game", "music" 等
  year?: number;              // 発売年・放送年
  
  // リンク情報
  links?: {
    official?: string;        // 公式サイト
    wikipedia?: string;       // Wikipedia（日本語/英語）
    wikidataId?: string;      // Wikidata ID（Q番号）
    
    // 購入・視聴サービス
    amazon?: string;          // Amazon商品ページ
    rakuten?: string;         // 楽天市場
    
    // ストリーミング（アニメ・ドラマ）
    netflix?: string;
    amazonPrime?: string;
    crunchyroll?: string;
    
    // 音楽
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
    
    // ゲーム
    steam?: string;
    nintendoEshop?: string;
    playstationStore?: string;
    
    // その他
    myanimelist?: string;     // MyAnimeList
    anilist?: string;         // AniList
    vndb?: string;            // The Visual Novel Database
    
    // カスタムリンク
    custom?: Array<{
      name: string;
      url: string;
      icon?: string;          // オプション: emoji or icon name
    }>;
  };
  
  // その他の情報
  [key: string]: any;         // 将来の拡張用
}
```

#### 1.2 ログのメタデータ構造（将来の拡張）

現在、ログテーブルには`metadata`フィールドがないため、**将来的な拡張**として以下を検討：

**Option A: ログテーブルにmetadataカラムを追加**
```sql
ALTER TABLE logs ADD COLUMN metadata TEXT DEFAULT '{}';
```

**Option B: タグのメタデータを参照**
- ログに紐づくタグのメタデータを集約して表示
- 追加のテーブル変更不要
- より簡潔で実装が容易

→ **推奨: Option B（初期実装）**、必要に応じてOption Aに移行

### 2. UI設計

#### 2.1 タグ詳細ページ

**表示位置**: タグ詳細カード内の「ℹ️ 情報」セクションに「🔗 関連リンク」セクションを追加

**レイアウト案**:

```
┌─────────────────────────────────────────┐
│ タグ詳細カード                            │
├─────────────────────────────────────────┤
│ 📝 説明                                   │
│ [Markdown表示]                           │
├─────────────────────────────────────────┤
│ 🔗 関連リンク                             │
│ ┌─────────────────────────────────────┐ │
│ │ 🌐 公式サイト                         │ │
│ │ 📖 Wikipedia                         │ │
│ │ 🛒 Amazon で購入                     │ │
│ │ 📺 Netflix で視聴                    │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ℹ️ 情報                                   │
│ 📊 使用回数: XX 回                        │
│ ...                                      │
└─────────────────────────────────────────┘
```

**リンクボタンのデザイン**:
- アイコン + テキストラベル
- `target="_blank" rel="noopener noreferrer"` で新しいタブで開く
- hover時にプレビューURL表示（tooltip）
- 統一されたスタイル（shadcn/ui Button）

#### 2.2 ログ詳細ページ

**Option 1: タグのメタデータを集約表示**
```
┌─────────────────────────────────────────┐
│ ログ詳細                                  │
├─────────────────────────────────────────┤
│ [本文]                                    │
├─────────────────────────────────────────┤
│ 🏷️ タグ                                   │
│ #Anime  #AttackOnTitan                   │
├─────────────────────────────────────────┤
│ 🔗 関連リンク（タグから）                  │
│ Attack on Titan:                         │
│   🌐 公式サイト                           │
│   📖 Wikipedia                           │
│   📺 Netflix で視聴                       │
└─────────────────────────────────────────┘
```

**Option 2: 各タグの下にリンクを表示**
```
┌─────────────────────────────────────────┐
│ 🏷️ タグ                                   │
│ ┌───────────────────────────────────┐   │
│ │ #AttackOnTitan                    │   │
│ │ 🌐 公式 📖 Wikipedia 📺 Netflix    │   │
│ └───────────────────────────────────┘   │
│ ┌───────────────────────────────────┐   │
│ │ #Anime                            │   │
│ │ 📖 Wikipedia                      │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

→ **推奨: Option 1** - より読みやすく、視覚的にクリーン

#### 2.3 リンクタイプとアイコンのマッピング

| リンクタイプ | アイコン | ラベル例 |
|------------|---------|---------|
| official | 🌐 | 公式サイト |
| wikipedia | 📖 | Wikipedia |
| amazon | 🛒 | Amazon |
| rakuten | 🛒 | 楽天市場 |
| netflix | 📺 | Netflix |
| amazonPrime | 📺 | Prime Video |
| crunchyroll | 📺 | Crunchyroll |
| spotify | 🎵 | Spotify |
| appleMusic | 🎵 | Apple Music |
| youtube | ▶️ | YouTube |
| steam | 🎮 | Steam |
| myanimelist | 📊 | MyAnimeList |
| custom | 🔗 | (カスタム名) |

### 3. API設計

#### 3.1 既存APIの活用

現在のAPI仕様（`/api/v1/openapi.yaml`）では、タグの`metadata`フィールドは既に定義されている：

```yaml
Tag:
  properties:
    metadata:
      type: object
      description: Flexible metadata storage
```

**変更不要**: 既存のタグ作成・更新APIで`metadata.links`を設定できる

#### 3.2 タグ作成・更新時のバリデーション

バックエンド（`backend/src/models/Tag.ts`）で以下のバリデーションを追加（オプション）:

```typescript
class TagModel {
  static isValidMetadata(metadata: any): boolean {
    if (typeof metadata !== 'object') return false;
    
    // links フィールドがある場合、各URLが有効かチェック
    if (metadata.links) {
      for (const [key, value] of Object.entries(metadata.links)) {
        if (key === 'custom') {
          // custom リンクの配列チェック
          if (!Array.isArray(value)) return false;
          for (const link of value) {
            if (!link.name || !link.url) return false;
            if (!isValidUrl(link.url)) return false;
          }
        } else if (value && typeof value === 'string') {
          // 単一URLのチェック
          if (!isValidUrl(value)) return false;
        }
      }
    }
    
    return true;
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### 4. 実装計画

#### Phase 1: 基本実装（必須）

1. **データ準備**
   - シードデータに具体的なリンク例を追加
   - Attack on Titan、Anime等のタグに`metadata.links`を設定

2. **UIコンポーネント作成**
   - `ContentLinks.tsx`: リンク表示用の共通コンポーネント
   - リンクタイプからアイコンへのマッピング

3. **タグ詳細ページ統合**
   - `TagDetailPage.tsx`に`ContentLinks`コンポーネントを追加
   - 「🔗 関連リンク」セクションの表示

4. **ログ詳細ページ統合**
   - `LogDetailPage.tsx`でタグのメタデータを集約
   - 関連リンクセクションの表示

5. **タグ作成・編集フォーム改善**
   - `TagForm.tsx`でリンク入力UIを追加（オプション）

#### Phase 2: 拡張機能（任意）

1. **リンクプレビュー**
   - Open Graph APIでリンクのプレビュー情報取得
   - サムネイル画像の表示

2. **リンク分析**
   - リンクのクリック数を記録
   - 人気のあるリンクを表示

3. **ログのメタデータ対応**
   - ログテーブルに`metadata`カラム追加
   - ログ固有のリンクを設定可能に

4. **自動リンク提案**
   - タグ名から自動的にWikipedia URLを生成
   - 外部APIを使った情報補完

### 5. セキュリティ考慮事項

1. **XSS対策**: URLは必ず`target="_blank" rel="noopener noreferrer"`で開く
2. **URLバリデーション**: 不正なスキーム（`javascript:`等）を防ぐ
3. **外部リンク警告**: ユーザーに外部サイトに移動することを明示
4. **HTTPS推奨**: 可能な限りHTTPSのURLを使用

### 6. テスト計画

#### 6.1 ユニットテスト

- `TagModel.isValidMetadata()` のテスト
- URLバリデーションのテスト

#### 6.2 統合テスト

- タグ作成時にメタデータが正しく保存される
- タグ詳細取得時にメタデータが含まれる

#### 6.3 UIテスト

- リンクが正しく表示される
- リンククリックで新しいタブが開く
- 存在しないリンクタイプは表示されない

### 7. シードデータ例

```sql
-- タグにリンク情報を追加
UPDATE tags SET metadata = json('{
  "category": "anime",
  "year": 2013,
  "studio": "Studio WIT",
  "episodes": 25,
  "links": {
    "official": "https://shingeki.tv/",
    "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人_(アニメ)",
    "myanimelist": "https://myanimelist.net/anime/16498/Shingeki_no_Kyojin",
    "crunchyroll": "https://www.crunchyroll.com/series/GR751KNZY/attack-on-titan",
    "amazon": "https://www.amazon.co.jp/dp/B00F3S9TXE",
    "netflix": "https://www.netflix.com/title/70299043"
  }
}') WHERE name = 'Attack on Titan';

UPDATE tags SET metadata = json('{
  "category": "media",
  "links": {
    "wikipedia": "https://ja.wikipedia.org/wiki/アニメ",
    "myanimelist": "https://myanimelist.net/"
  }
}') WHERE name = 'Anime';

UPDATE tags SET metadata = json('{
  "category": "game",
  "genre": "Action RPG",
  "year": 2022,
  "links": {
    "official": "https://en.bandainamcoent.eu/elden-ring/elden-ring",
    "steam": "https://store.steampowered.com/app/1245620/ELDEN_RING/",
    "wikipedia": "https://ja.wikipedia.org/wiki/エルデンリング",
    "playstationStore": "https://store.playstation.com/ja-jp/product/JP0700-PPSA09157_00-ELDENRING0000000"
  }
}') WHERE name = 'Gaming';
```

### 8. UI実装例

#### ContentLinks.tsx

```typescript
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContentLinksProps {
  links: Record<string, string | Array<{name: string, url: string, icon?: string}>>;
  className?: string;
}

const linkConfig = {
  official: { icon: '🌐', label: '公式サイト' },
  wikipedia: { icon: '📖', label: 'Wikipedia' },
  amazon: { icon: '🛒', label: 'Amazon' },
  netflix: { icon: '📺', label: 'Netflix' },
  spotify: { icon: '🎵', label: 'Spotify' },
  steam: { icon: '🎮', label: 'Steam' },
  myanimelist: { icon: '📊', label: 'MyAnimeList' },
  // ... 他のサービス
};

export function ContentLinks({ links, className = '' }: ContentLinksProps) {
  if (!links || Object.keys(links).length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">🔗 関連リンク</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(links).map(([key, value]) => {
          if (key === 'custom' && Array.isArray(value)) {
            return value.map((link, idx) => (
              <Button
                key={`${key}-${idx}`}
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <span>{link.icon || '🔗'}</span>
                  <span>{link.name}</span>
                  <ExternalLink size={14} />
                </a>
              </Button>
            ));
          }
          
          if (typeof value === 'string' && linkConfig[key]) {
            const config = linkConfig[key];
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                  <ExternalLink size={14} />
                </a>
              </Button>
            );
          }
          
          return null;
        })}
      </div>
    </div>
  );
}
```

### 9. まとめ

この設計により、以下が実現されます：

✅ **柔軟性**: 既存の`metadata`フィールドを活用し、任意のリンクを追加可能  
✅ **拡張性**: 新しいサービスの追加が容易  
✅ **ユーザビリティ**: 分かりやすいアイコンとラベルでリンクを表示  
✅ **互換性**: 既存のデータモデルやAPIに影響を与えない  
✅ **段階的実装**: Phase 1（必須）→ Phase 2（任意）の順に実装可能  

この設計書をベースに、Phase 1の実装を進めることで、ユーザーがタグやログに関連するコンテンツに簡単にアクセスできるようになります。
