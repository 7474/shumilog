# コンテンツリンク機能 - メタデータ自動収集計画

## 概要

このドキュメントは、タグのメタデータ（特にリンク情報）を**人間の手間を最小限に**収集する方法を説明します。

## 問題

手動でメタデータを入力するのは：
- ❌ 時間がかかる
- ❌ エラーが発生しやすい
- ❌ スケールしない
- ❌ ユーザー体験が悪い

## 解決策の全体像

```
┌─────────────────────────────────────────────────────────────────┐
│ メタデータ収集の3段階アプローチ                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Phase 1: 手動入力（初期実装）                                    │
│   - タグ作成時に任意でリンクを入力                               │
│   - 最小限の実装                                                 │
│                                                                 │
│ Phase 2: 半自動収集（推奨）                                      │
│   - タグ名から自動的にリンクを提案                               │
│   - ユーザーが確認・選択                                         │
│   - 80%以上の手間を削減                                          │
│                                                                 │
│ Phase 3: 完全自動収集（将来）                                    │
│   - バックグラウンドで自動的にメタデータを補完                   │
│   - ユーザーは何もしない                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 2: 半自動収集（推奨実装）

### 1. Wikipedia URL自動生成

#### 仕組み

タグ名から自動的にWikipedia URLを生成：

```typescript
// backend/src/services/MetadataService.ts
export class MetadataService {
  /**
   * タグ名からWikipedia URLを自動生成
   * 例: "進撃の巨人" → "https://ja.wikipedia.org/wiki/進撃の巨人"
   */
  static generateWikipediaUrl(tagName: string, lang: string = 'ja'): string {
    const encodedName = encodeURIComponent(tagName.trim());
    return `https://${lang}.wikipedia.org/wiki/${encodedName}`;
  }
  
  /**
   * Wikipedia URLが実際に存在するか確認（オプション）
   */
  static async validateWikipediaUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```

#### UI実装

```tsx
// frontend/src/components/TagForm.tsx
export function TagForm() {
  const [tagName, setTagName] = useState('');
  const [suggestedLinks, setSuggestedLinks] = useState({});
  
  // タグ名が変更されたら自動的にリンクを提案
  useEffect(() => {
    if (tagName.length > 2) {
      const wikipediaUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(tagName)}`;
      setSuggestedLinks({ wikipedia: wikipediaUrl });
    }
  }, [tagName]);
  
  return (
    <form>
      <input value={tagName} onChange={(e) => setTagName(e.target.value)} />
      
      {suggestedLinks.wikipedia && (
        <div className="suggested-links">
          <p>📖 提案されたリンク:</p>
          <button onClick={() => addLink('wikipedia', suggestedLinks.wikipedia)}>
            Wikipedia リンクを追加
          </button>
        </div>
      )}
    </form>
  );
}
```

### 2. Wikidata API統合

#### 仕組み

WikidataはWikipediaの構造化データベースで、多くの情報を自動取得できます：

```typescript
// backend/src/services/WikidataService.ts
export class WikidataService {
  /**
   * タグ名からWikidataエンティティを検索
   */
  static async searchEntity(tagName: string): Promise<WikidataEntity | null> {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(tagName)}&language=ja&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.search && data.search.length > 0) {
      return data.search[0]; // 最初の結果を返す
    }
    return null;
  }
  
  /**
   * WikidataエンティティIDから詳細情報を取得
   */
  static async getEntityDetails(entityId: string): Promise<EntityDetails> {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&format=json&props=claims|sitelinks`;
    
    const response = await fetch(url);
    const data = await response.json();
    const entity = data.entities[entityId];
    
    return {
      wikidataId: entityId,
      officialWebsite: this.extractClaim(entity, 'P856'), // P856 = official website
      imdb: this.extractClaim(entity, 'P345'),            // P345 = IMDb ID
      myanimelist: this.extractClaim(entity, 'P4084'),     // P4084 = MyAnimeList ID
      wikipedia: entity.sitelinks?.jawiki?.url,
      // ... 他のプロパティ
    };
  }
  
  private static extractClaim(entity: any, propertyId: string): string | null {
    const claims = entity.claims?.[propertyId];
    if (claims && claims.length > 0) {
      return claims[0].mainsnak.datavalue.value;
    }
    return null;
  }
}
```

#### 取得できる情報の例

Wikidataから自動的に取得できる情報：

| プロパティ | Wikidata ID | 例 |
|-----------|-------------|---|
| 公式サイト | P856 | https://shingeki.tv/ |
| IMDb ID | P345 | tt2560140 |
| MyAnimeList ID | P4084 | 16498 |
| AniList ID | P8729 | 16498 |
| Wikipedia (各言語) | sitelinks | ja, en, etc. |
| 発売日/放送日 | P577 | 2013-04-07 |
| 制作会社 | P272 | Studio WIT |
| ジャンル | P136 | Action, Dark Fantasy |

### 3. タグ作成時の自動提案フロー

```
1. ユーザーがタグ名を入力
   │
   ▼
2. フロントエンドでWikipedia URLを自動生成
   │
   ▼
3. バックエンドAPIに「メタデータ提案」をリクエスト
   │ POST /api/tags/suggest-metadata
   │ { "name": "進撃の巨人" }
   │
   ▼
4. バックエンドでWikidata APIを呼び出し
   │
   ▼
5. 提案されたメタデータを返す
   │ {
   │   "suggestions": {
   │     "official": "https://shingeki.tv/",
   │     "wikipedia": "https://ja.wikipedia.org/wiki/進撃の巨人",
   │     "myanimelist": "https://myanimelist.net/anime/16498/",
   │     "year": 2013,
   │     "category": "anime"
   │   }
   │ }
   │
   ▼
6. フロントエンドで提案を表示
   │
   ▼
7. ユーザーが確認・選択
   │ [✓] 公式サイト
   │ [✓] Wikipedia
   │ [✓] MyAnimeList
   │ [✗] IMDb (不要なので除外)
   │
   ▼
8. タグ作成時に選択されたリンクを保存
```

### 4. API実装例

#### エンドポイント: POST /api/tags/suggest-metadata

```typescript
// backend/src/routes/tags.ts
app.post('/api/tags/suggest-metadata', async (c) => {
  const { name } = await c.req.json();
  
  if (!name || name.length < 2) {
    return c.json({ error: 'Tag name is required' }, 400);
  }
  
  try {
    // Wikidata検索
    const entity = await WikidataService.searchEntity(name);
    
    if (!entity) {
      // Wikidataで見つからない場合はWikipediaのみ提案
      return c.json({
        suggestions: {
          wikipedia: MetadataService.generateWikipediaUrl(name),
        }
      });
    }
    
    // Wikidata詳細取得
    const details = await WikidataService.getEntityDetails(entity.id);
    
    // リンクを構築
    const suggestions: any = {};
    
    if (details.officialWebsite) {
      suggestions.official = details.officialWebsite;
    }
    
    if (details.wikipedia) {
      suggestions.wikipedia = details.wikipedia;
    }
    
    if (details.myanimelist) {
      suggestions.myanimelist = `https://myanimelist.net/anime/${details.myanimelist}/`;
    }
    
    if (details.imdb) {
      suggestions.imdb = `https://www.imdb.com/title/${details.imdb}/`;
    }
    
    return c.json({ suggestions });
    
  } catch (error) {
    console.error('Failed to fetch metadata suggestions:', error);
    
    // エラー時はWikipediaのみ提案
    return c.json({
      suggestions: {
        wikipedia: MetadataService.generateWikipediaUrl(name),
      }
    });
  }
});
```

### 5. フロントエンド実装例

```tsx
// frontend/src/components/TagForm.tsx
export function TagForm({ onSuccess }: TagFormProps) {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<MetadataSuggestions | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // タグ名変更時に自動的にメタデータを提案
  const fetchSuggestions = async (tagName: string) => {
    if (tagName.length < 2) {
      setSuggestions(null);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.POST('/tags/suggest-metadata', {
        body: { name: tagName }
      });
      
      if (response.data) {
        setSuggestions(response.data.suggestions);
        // デフォルトで全て選択
        setSelectedLinks(Object.keys(response.data.suggestions));
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // デバウンス付きで提案取得
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(name);
    }, 500); // 500ms待機
    
    return () => clearTimeout(timer);
  }, [name]);
  
  const handleSubmit = async () => {
    // 選択されたリンクのみを含むメタデータを作成
    const links: any = {};
    selectedLinks.forEach(key => {
      if (suggestions?.[key]) {
        links[key] = suggestions[key];
      }
    });
    
    const metadata = { links };
    
    // タグ作成
    await api.POST('/tags', {
      body: { name, metadata }
    });
    
    onSuccess();
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>タグ名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 進撃の巨人"
        />
      </div>
      
      {loading && <div>提案を取得中...</div>}
      
      {suggestions && Object.keys(suggestions).length > 0 && (
        <div className="metadata-suggestions">
          <h3>📎 自動的に見つかったリンク</h3>
          <p className="text-sm text-gray-600">
            必要なリンクにチェックを入れてください
          </p>
          
          {Object.entries(suggestions).map(([key, url]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedLinks.includes(key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLinks([...selectedLinks, key]);
                  } else {
                    setSelectedLinks(selectedLinks.filter(k => k !== key));
                  }
                }}
              />
              <span className="font-medium">{getLinkLabel(key)}</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 truncate"
              >
                {url}
              </a>
            </div>
          ))}
        </div>
      )}
      
      <button type="submit">タグを作成</button>
    </form>
  );
}

function getLinkLabel(key: string): string {
  const labels: Record<string, string> = {
    official: '🌐 公式サイト',
    wikipedia: '📖 Wikipedia',
    myanimelist: '📊 MyAnimeList',
    imdb: '🎬 IMDb',
    // ...
  };
  return labels[key] || key;
}
```

## Phase 3: 完全自動収集（将来）

### 1. バックグラウンドジョブでメタデータを補完

```typescript
// backend/src/jobs/enrichMetadata.ts
export async function enrichTagMetadata(tagId: string) {
  const tag = await db.get('SELECT * FROM tags WHERE id = ?', tagId);
  
  if (!tag) return;
  
  // 既にリンクが設定されている場合はスキップ
  const metadata = TagModel.parseMetadata(tag.metadata);
  if (metadata.links && Object.keys(metadata.links).length > 0) {
    return;
  }
  
  // Wikidataから自動的にメタデータを取得
  const entity = await WikidataService.searchEntity(tag.name);
  if (!entity) return;
  
  const details = await WikidataService.getEntityDetails(entity.id);
  
  // メタデータを更新
  metadata.links = {
    official: details.officialWebsite,
    wikipedia: details.wikipedia,
    myanimelist: details.myanimelist ? `https://myanimelist.net/anime/${details.myanimelist}/` : undefined,
    // ...
  };
  
  // NULL値を除去
  Object.keys(metadata.links).forEach(key => {
    if (!metadata.links[key]) {
      delete metadata.links[key];
    }
  });
  
  // DBに保存
  await db.run(
    'UPDATE tags SET metadata = ? WHERE id = ?',
    TagModel.serializeMetadata(metadata),
    tagId
  );
}
```

### 2. Cloudflare Queues / Cron Triggersで定期実行

```typescript
// backend/src/scheduled.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // 毎日1回、メタデータが不足しているタグを補完
    const tags = await env.DB.prepare(
      `SELECT id, name FROM tags 
       WHERE metadata = '{}' OR json_extract(metadata, '$.links') IS NULL
       LIMIT 100`
    ).all();
    
    for (const tag of tags.results) {
      ctx.waitUntil(enrichTagMetadata(tag.id));
    }
  }
};
```

### 3. ユーザー生成コンテンツからの学習

将来的には、ユーザーがログに含めたリンクから学習：

```typescript
// ログから公式サイトのパターンを学習
// 例: "Attack on Titan" のログに https://shingeki.tv/ が頻繁に含まれる
//     → 自動的にタグのメタデータに追加
```

## 実装の優先順位

### Phase 1: 手動入力（初期実装）
- **優先度**: 高
- **工数**: 0.5日
- **実装内容**:
  - タグフォームでリンクを手動入力できるようにする
  - 最小限の実装

### Phase 2: 半自動収集（推奨）
- **優先度**: 高
- **工数**: 2-3日
- **実装内容**:
  1. Wikipedia URL自動生成（0.5日）
  2. Wikidata API統合（1日）
  3. メタデータ提案API（0.5日）
  4. フロントエンドUI（1日）

### Phase 3: 完全自動収集（将来）
- **優先度**: 中
- **工数**: 3-5日
- **実装内容**:
  1. バックグラウンドジョブ（1日）
  2. Cloudflare Cron設定（0.5日）
  3. 学習アルゴリズム（2-3日）

## 手間削減の効果

| 方法 | 手動入力時間 | 自動化後の時間 | 削減率 |
|------|------------|--------------|--------|
| Phase 1: 手動入力 | 5分/タグ | 5分/タグ | 0% |
| Phase 2: 半自動収集 | 5分/タグ | 30秒/タグ | **90%削減** |
| Phase 3: 完全自動 | 5分/タグ | 0秒/タグ | **100%削減** |

## セキュリティとレート制限

### Wikidata APIのレート制限

- **制限**: 特になし（推奨: 1リクエスト/秒以下）
- **対策**: 
  - キャッシュを活用
  - バックグラウンドで処理
  - ユーザーリクエストは直接呼び出し

### キャッシュ戦略

```typescript
// Wikidataの結果をキャッシュ（24時間）
const cacheKey = `wikidata:${tagName}`;
const cached = await env.CACHE.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await WikidataService.searchEntity(tagName);
await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 });

return result;
```

## まとめ

### 推奨アプローチ

**Phase 2（半自動収集）を推奨**：

✅ **メリット**:
- 90%以上の手間を削減
- ユーザーが確認できるので正確性が高い
- 実装が比較的簡単（2-3日）
- 外部APIに過度に依存しない

✅ **実装手順**:
1. Wikipedia URL自動生成（簡単）
2. Wikidata API統合（核心機能）
3. タグフォームにUI追加
4. ユーザーテストとフィードバック収集

✅ **ユーザー体験**:
```
従来: タグ名入力 → 公式サイトを検索 → URLコピー → 貼り付け → Wikipedia検索 → ...
                (5分かかる)

改善後: タグ名入力 → 自動的にリンクが表示 → チェックボックスで選択
                (30秒で完了)
```

この設計により、人間の手間を**最小限**に抑えながら、高品質なメタデータを収集できます。

---

**次のステップ**: Phase 2の実装を開始し、ユーザーフィードバックを元にPhase 3の必要性を判断します。
