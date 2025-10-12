# コンテンツリンク機能 - 調査・研究

## 調査目的

ログやタグに関連する外部コンテンツ（公式サイト、Wikipedia、購入URL等）へのアクセスを実現するための技術的調査と設計判断。

## 既存実装の調査

### 1. 現在のデータモデル

#### タグテーブル (tags)

```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',  -- JSON文字列
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

**発見**:
- ✅ `metadata`カラムが既に存在（TEXT型でJSON文字列を格納）
- ✅ デフォルト値は空のJSONオブジェクト`'{}'`
- ✅ NULL不許可（NOT NULL制約）

#### ログテーブル (logs)

```sql
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  content_md TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**発見**:
- ❌ `metadata`カラムは存在しない
- ⚠️ ログ固有のメタデータを保存するにはマイグレーションが必要

### 2. バックエンド実装

#### TagModel (backend/src/models/Tag.ts)

```typescript
export class TagModel {
  static parseMetadata(metadataJson: string): object {
    try {
      return JSON.parse(metadataJson);
    } catch {
      return {};
    }
  }

  static serializeMetadata(metadata: object): string {
    return JSON.stringify(metadata || {});
  }
}
```

**発見**:
- ✅ メタデータのパース・シリアライズ機能が既に実装済み
- ✅ エラーハンドリング（パース失敗時は空オブジェクト）
- ℹ️ 現在はバリデーションなし

### 3. フロントエンド実装

#### TagDetailPage (frontend/src/pages/TagDetailPage.tsx)

**発見**:
- ℹ️ メタデータは取得されているが表示されていない
- ✅ `tag.description`はMarkdownとして表示される
- ✅ 基本情報（使用回数、作成日等）は表示される

```tsx
{/* メタデータ */}
<div className="border-t border-gray-100 pt-4 space-y-2">
  <h3 className="text-sm font-semibold text-gray-700 mb-2">ℹ️ 情報</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
    <div className="flex items-start space-x-2">
      <span className="text-gray-500 font-medium min-w-[100px]">📊 使用回数:</span>
      <span className="text-gray-900">{tag.log_count} 回</span>
    </div>
    {/* ... */}
  </div>
</div>
```

**改善点**: メタデータ内のリンク情報を表示するセクションを追加する必要がある

### 4. シードデータ

```sql
INSERT OR IGNORE INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
VALUES 
  ('tag_anime', 'Anime', 'Japanese animation', '{"category": "media"}', 'user_alice', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_attack_on_titan', 'Attack on Titan', 'Popular anime and manga series', '{"category": "series"}', 'user_alice', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');
```

**発見**:
- ℹ️ 現在のメタデータは非常にシンプル（`category`のみ）
- ⚠️ リンク情報は含まれていない
- 💡 シードデータを拡張して具体的なリンク例を追加する必要がある

## 設計上の選択肢

### Option 1: タグのメタデータのみ拡張（推奨）

**メリット**:
- ✅ スキーマ変更不要
- ✅ 実装が簡単
- ✅ 既存のAPIと完全に互換
- ✅ バックエンドの変更が最小限

**デメリット**:
- ⚠️ ログ固有のリンクは保存できない
- ⚠️ タグに紐づかないコンテンツのリンクは保存できない

**判断**: **Phase 1ではこのオプションを採用**

### Option 2: ログテーブルにもメタデータカラムを追加

**メリット**:
- ✅ ログごとに独自のリンクを保存可能
- ✅ より柔軟な設計

**デメリット**:
- ❌ マイグレーションが必要
- ❌ バックエンドの変更が大きい
- ❌ APIスキーマの変更が必要
- ❌ 既存データへの影響

**判断**: **Phase 2（将来の拡張）として検討**

### Option 3: 専用のリンクテーブルを作成

**メリット**:
- ✅ リンクの管理が明示的
- ✅ リンクに対する操作（クリック数記録等）が容易

**デメリット**:
- ❌ スキーマが複雑になる
- ❌ JOIN操作が増える
- ❌ 過剰な設計

**判断**: **採用しない** - JSONメタデータで十分

## 技術的考慮事項

### 1. Cloudflare D1の制限

**調査結果**:
- ✅ JSON関数がサポートされている（`json()`, `json_extract()`, `json_patch()`）
- ⚠️ テキストカラムの最大サイズ: 1MB（実用上は64KB以下を推奨）
- ✅ SQLiteベースのため、JSONの扱いは標準的

**判断**: 
- メタデータ全体を64KB以下に制限
- バリデーションでサイズチェックを実施

### 2. URL検証とセキュリティ

**セキュリティリスク**:
- XSS攻撃（`javascript:`スキーム等）
- オープンリダイレクト
- フィッシングサイトへのリンク

**対策**:
1. ✅ URLスキームを`http:`/`https:`に制限
2. ✅ `rel="noopener noreferrer"`属性を付与
3. ✅ `target="_blank"`で新しいタブで開く
4. ⚠️ フィッシング対策は現時点では実装しない（将来的に外部APIで検証）

**実装例**:
```typescript
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
```

### 3. リンクアイコンとラベル

**検討事項**:
- **Option A**: Font Icon（Lucide React等）
- **Option B**: Emoji
- **Option C**: サービス固有のロゴ画像

**判断**: **Option B（Emoji）を主に使用**

**理由**:
- ✅ 追加のライブラリ不要
- ✅ ユニバーサルで分かりやすい
- ✅ 軽量（バンドルサイズが増えない）
- ⚠️ サービス固有のロゴは将来的に検討

**マッピング例**:
```typescript
const linkConfig = {
  official: { icon: '🌐', label: '公式サイト' },
  wikipedia: { icon: '📖', label: 'Wikipedia' },
  amazon: { icon: '🛒', label: 'Amazon' },
  netflix: { icon: '📺', label: 'Netflix' },
  spotify: { icon: '🎵', label: 'Spotify' },
  steam: { icon: '🎮', label: 'Steam' },
  myanimelist: { icon: '📊', label: 'MyAnimeList' },
};
```

### 4. UIコンポーネント設計

**要件**:
- レスポンシブ（モバイルファースト）
- アクセシブル
- 既存のデザインシステムと統一（shadcn/ui）

**実装方針**:
```tsx
<Button
  variant="outline"
  size="sm"
  asChild
>
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2"
  >
    <span>{icon}</span>
    <span>{label}</span>
    <ExternalLink size={14} />
  </a>
</Button>
```

**判断**: 
- ✅ `Button`コンポーネントを`asChild`で使用（shadcn/uiのパターン）
- ✅ `ExternalLink`アイコンで外部リンクであることを明示

## 参考事例

### 類似サービスの調査

#### 1. MyAnimeList
- **リンク表示**: 各作品ページにExternal Linksセクション
- **対応サービス**: 公式サイト、Wikipedia、Twitter等
- **UI**: シンプルなリンクリスト

#### 2. IMDb
- **リンク表示**: 右サイドバーに各種リンク
- **対応サービス**: 公式サイト、Technical Specs等
- **UI**: アイコン+テキストラベル

#### 3. Steam
- **リンク表示**: ゲームページに「Visit the website」等
- **対応サービス**: 公式サイト、Wiki、フォーラム等
- **UI**: 目立つボタン形式

**学び**:
- ℹ️ リンクセクションは専用のエリアにまとめる
- ℹ️ アイコンとラベルを併用すると分かりやすい
- ℹ️ 外部リンクであることを明示的に示す

## 実装の優先順位

### Phase 1: 基本実装（必須）

1. **データモデル確定** ✅
   - タグの`metadata.links`構造を定義
   - バリデーション実装

2. **シードデータ更新**
   - Attack on Titan等の人気コンテンツにリンク追加
   - 各カテゴリ（アニメ、ゲーム、音楽、マンガ）の代表例

3. **UIコンポーネント作成**
   - `ContentLinks.tsx`コンポーネント
   - リンクアイコンマッピング

4. **タグ詳細ページ統合**
   - リンクセクションの追加

5. **ログ詳細ページ統合**
   - タグのリンクを集約表示

### Phase 2: 拡張機能（任意）

1. **タグフォーム改善**
   - リンク入力UIの追加

2. **リンクプレビュー**
   - Open Graph データの取得・表示

3. **ログのメタデータ対応**
   - マイグレーション
   - API拡張

4. **自動リンク生成**
   - Wikipedia URL自動生成
   - Wikidata API統合

## まとめ

### 採用する設計

1. **データ**: タグの`metadata.links`フィールドを拡張
2. **バリデーション**: URL形式チェック、危険なスキーム拒否
3. **UI**: Emojiアイコン + テキストラベル + shadcn/ui Button
4. **セキュリティ**: `rel="noopener noreferrer"`、`target="_blank"`
5. **実装順序**: Phase 1（タグのみ）→ Phase 2（ログ対応）

### 次のステップ

1. ✅ 設計ドキュメント完成
2. ⏭️ シードデータの更新
3. ⏭️ `ContentLinks.tsx`コンポーネントの実装
4. ⏭️ UI統合（TagDetailPage、LogDetailPage）
5. ⏭️ テスト作成

この調査に基づいて、実装を進めます。
