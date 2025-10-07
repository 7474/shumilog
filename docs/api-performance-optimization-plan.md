# API応答高速化計画

## 概要

Cloudflareが提供するサービスの範囲内で、APIレスポンスタイムの目標値を達成するための包括的な最適化計画。

### パフォーマンス目標

- **90パーセンタイル**: 100ms以下
- **99パーセンタイル**: 500ms以下

### 現状分析

本番環境の計測結果によると、一部のリクエストでレスポンスタイムが目標を超過している。
既にCache APIによる基本的なキャッシュ実装は完了しているが、さらなる最適化が必要。

## 最適化戦略

### 1. エッジキャッシュの最適化（短期・高優先度）

#### 1.1 キャッシュTTLの調整

**現状**: 全公開エンドポイントで一律5分（300秒）のTTL

**提案**: エンドポイントごとに最適なTTLを設定

```typescript
// キャッシュ戦略のエンドポイント別設定例
const CACHE_STRATEGIES = {
  '/health': { ttl: 60, swr: 30 },           // ヘルスチェック: 1分
  '/tags': { ttl: 600, swr: 300 },           // タグ一覧: 10分（変更頻度低）
  '/logs': { ttl: 180, swr: 60 },            // ログ一覧: 3分
  '/logs/:id': { ttl: 300, swr: 120 },       // ログ詳細: 5分
  '/users/:id/logs': { ttl: 180, swr: 60 },  // ユーザーログ: 3分
};
```

**効果**: 変更頻度の低いデータ（タグ、ユーザー情報等）のキャッシュヒット率向上
**実装難易度**: 低
**予想改善**: キャッシュヒット時 10-20ms

#### 1.2 キャッシュキーの最適化

**現状**: URLベースの単純なキャッシュキー

**提案**: クエリパラメータの正規化とキャッシュキーの最適化

```typescript
// キャッシュキー生成の改善
function generateCacheKey(url: URL): string {
  // クエリパラメータを正規化（順序を統一）
  const params = new URLSearchParams();
  const sortedKeys = Array.from(url.searchParams.keys()).sort();
  
  for (const key of sortedKeys) {
    const value = url.searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }
  
  return `${url.pathname}?${params.toString()}`;
}
```

**効果**: 同一リクエストのキャッシュヒット率向上
**実装難易度**: 低
**予想改善**: キャッシュヒット率 5-10%向上

#### 1.3 Vary ヘッダーの最適化

**現状**: `Vary: Origin`のみ設定

**提案**: 必要最小限のVaryヘッダーで最大限のキャッシュ効率を実現

```typescript
// エンドポイント特性に応じたVaryヘッダー
- 公開データ: Vary: Origin のみ（現状維持）
- 条件付き応答: Vary: Origin, Accept-Language（必要な場合のみ）
```

**効果**: 不必要なキャッシュの細分化を防止
**実装難易度**: 低
**予想改善**: キャッシュヒット率 3-5%向上

### 2. データベースクエリの最適化（中期・高優先度）

#### 2.1 インデックスの最適化

**現状**: 基本的なインデックスは設定済み

**提案**: 複合インデックスとカバリングインデックスの追加

```sql
-- ログ検索用の複合インデックス
CREATE INDEX idx_logs_public_created ON logs(is_public, created_at DESC);

-- タグ付きログ検索用の複合インデックス
CREATE INDEX idx_log_tag_assoc_tag_created ON log_tag_associations(tag_id, created_at DESC);

-- ユーザーの公開ログ用の複合インデックス
CREATE INDEX idx_logs_user_public_created ON logs(user_id, is_public, created_at DESC);
```

**効果**: 頻繁に実行されるクエリの高速化
**実装難易度**: 中
**予想改善**: DB クエリ時間 30-50%削減（20-50ms改善）

#### 2.2 N+1クエリの解消

**現状**: ログ一覧取得時にタグやユーザー情報を個別取得している可能性

**提案**: JOINを使用した一括取得

```typescript
// ログ一覧取得の最適化例
async getLogsWithDetails(params: LogSearchParams): Promise<LogSearchResult> {
  // 単一のJOINクエリで必要なデータを一括取得
  const query = `
    SELECT 
      l.*,
      u.id as user_id, u.display_name, u.avatar_url,
      GROUP_CONCAT(DISTINCT t.id || ':' || t.name) as tags
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN log_tag_associations lta ON l.id = lta.log_id
    LEFT JOIN tags t ON lta.tag_id = t.id
    WHERE l.is_public = 1
    GROUP BY l.id
    ORDER BY l.created_at DESC
    LIMIT ?
  `;
  
  // 単一クエリで完結
  const results = await this.db.prepare(query).all([limit]);
  return this.parseLogsWithDetails(results);
}
```

**効果**: データベースラウンドトリップの削減
**実装難易度**: 中
**予想改善**: 複数ログ取得時 50-100ms削減

#### 2.3 Prepared Statementの再利用

**現状**: 都度SQLを準備

**提案**: 頻繁に使用されるクエリのPrepared Statementをキャッシュ

```typescript
class QueryCache {
  private statements = new Map<string, D1PreparedStatement>();
  
  getOrPrepare(db: D1Database, key: string, sql: string): D1PreparedStatement {
    if (!this.statements.has(key)) {
      this.statements.set(key, db.prepare(sql));
    }
    return this.statements.get(key)!;
  }
}
```

**効果**: クエリ準備のオーバーヘッド削減
**実装難易度**: 低
**予想改善**: クエリ実行時間 5-10ms削減

### 3. 応答データの最適化（短期・中優先度）

#### 3.1 ペイロードサイズの削減

**現状**: 全フィールドを常に返却

**提案**: フィールド選択とページネーションの改善

```typescript
// 一覧表示用の軽量レスポンス
interface LogSummary {
  id: string;
  title?: string;
  content_preview: string;  // 最初の100文字のみ
  is_public: boolean;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    // avatar_urlは不要な場合は省略
  };
  tags: Array<{ id: string; name: string }>;
  // content_md全体は詳細表示のみ
}
```

**効果**: ネットワーク転送量の削減
**実装難易度**: 中
**予想改善**: 応答サイズ 30-50%削減、転送時間 10-30ms削減

#### 3.2 Compression の活用

**現状**: Cloudflare が自動的に圧縮を適用

**提案**: 明示的な `Content-Encoding` 指定とbrotli活用を確認

```typescript
// レスポンスヘッダーで圧縮を明示
c.header('Content-Type', 'application/json; charset=utf-8');
// Cloudflare は自動的に gzip/brotli を適用
```

**効果**: 大きなレスポンスの転送時間短縮
**実装難易度**: 低（既に有効の可能性が高い）
**予想改善**: 大きなペイロード（>10KB）で 20-40%削減

### 4. Smart Placement の活用（中期・中優先度）

#### 4.1 Smart Placement の有効化

**提案**: Cloudflare Workers の Smart Placement 機能を有効化

```toml
# wrangler.toml
[placement]
mode = "smart"
```

**効果**: Workerがデータベース（D1）に近いリージョンで自動実行され、レイテンシ削減
**実装難易度**: 低（設定のみ）
**予想改善**: D1へのラウンドトリップ 20-50ms削減

**注意**: この機能は2024年時点でベータ版の可能性があるため、安定性を確認してから本番適用

### 5. D1 読み取り最適化（長期・高優先度）

#### 5.1 Read Replica の検討

**提案**: D1が Read Replica をサポートした際の活用

```typescript
// 読み取り専用クエリは Replica へ
const readDb = env.DB_REPLICA || env.DB;
const writeDb = env.DB;

// 読み取りクエリ
await readDb.prepare('SELECT * FROM logs WHERE is_public = 1').all();

// 書き込みクエリ
await writeDb.prepare('INSERT INTO logs ...').run();
```

**効果**: 読み取りパフォーマンスの大幅向上
**実装難易度**: 中（機能提供時）
**予想改善**: 読み取りクエリ 30-60%高速化

### 6. アプリケーションレベルのキャッシュ（短期・中優先度）

#### 6.1 メモリ内キャッシュの導入

**提案**: 頻繁にアクセスされる小さなデータをWorkerメモリにキャッシュ

```typescript
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  set(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000
    });
  }
}

// 使用例：タグ一覧のキャッシュ
const tagCache = new MemoryCache<Tag[]>();
```

**効果**: 頻繁にアクセスされるデータの取得時間をほぼゼロに
**実装難易度**: 中
**予想改善**: キャッシュヒット時 20-50ms削減

**注意**: Workerのメモリ制限（128MB）に注意し、適切なキャッシュサイズ管理が必要

#### 6.2 Durable Objects の検討

**提案**: 状態を持つキャッシュレイヤーとして Durable Objects を活用

```typescript
export class CacheLayer {
  private state: DurableObjectState;
  
  async fetch(request: Request): Promise<Response> {
    const cacheKey = new URL(request.url).pathname;
    let cached = await this.state.storage.get(cacheKey);
    
    if (cached) {
      return new Response(cached, { 
        headers: { 'X-Cache': 'HIT-DO' } 
      });
    }
    
    // キャッシュミス時の処理...
  }
}
```

**効果**: より長期的で一貫性のあるキャッシュ
**実装難易度**: 高
**予想改善**: 特定のホットデータで 50-100ms削減

### 7. 並列処理の最適化（中期・中優先度）

#### 7.1 非依存クエリの並列実行

**提案**: 独立したデータ取得を並列化

```typescript
// 改善前：順次実行
const logs = await logService.getLogs(params);
const tags = await tagService.getPopularTags();
const total = await logService.countLogs(params);

// 改善後：並列実行
const [logs, tags, total] = await Promise.all([
  logService.getLogs(params),
  tagService.getPopularTags(),
  logService.countLogs(params)
]);
```

**効果**: 複数の独立したデータソースからの取得時間短縮
**実装難易度**: 低
**予想改善**: 並列化可能な処理で 30-50%削減（30-100ms改善）

### 8. モニタリングとチューニング（継続・高優先度）

#### 8.1 詳細なパフォーマンス計測

**提案**: エンドポイントごとの詳細なタイミング計測

```typescript
// ミドルウェアでパフォーマンス計測
export const performanceMonitoring = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const timings: Record<string, number> = {};
    
    // カスタムタイミング記録用のヘルパー
    c.set('recordTiming', (label: string, duration: number) => {
      timings[label] = duration;
    });
    
    await next();
    
    const total = Date.now() - start;
    
    // レスポンスヘッダーに追加（開発環境のみ）
    if (c.env.ENVIRONMENT === 'development') {
      c.header('Server-Timing', Object.entries(timings)
        .map(([key, value]) => `${key};dur=${value}`)
        .join(', '));
      c.header('X-Response-Time', `${total}ms`);
    }
    
    // Analytics に送信
    c.executionCtx.waitUntil(
      logAnalytics({
        endpoint: c.req.path,
        method: c.req.method,
        duration: total,
        timings,
        status: c.res.status
      })
    );
  };
};
```

**効果**: ボトルネックの特定と継続的改善
**実装難易度**: 中
**予想改善**: 間接的（問題箇所の特定により後続改善を可能に）

#### 8.2 Cloudflare Analytics の活用

**提案**: Workers Analytics API を使用した詳細分析

```typescript
// wrangler.toml
[observability]
enabled = true

[observability.logs]
enabled = true
```

**効果**: 本番環境での実際のパフォーマンス把握
**実装難易度**: 低
**予想改善**: 間接的（データドリブンな改善判断）

### 9. リクエストの早期終了（短期・低優先度）

#### 9.1 条件付きリクエストのサポート

**提案**: ETag と Last-Modified ヘッダーのサポート

```typescript
export const conditionalRequest = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    if (c.req.method !== 'GET') return;
    
    // ETag生成（レスポンスボディのハッシュ）
    const body = await c.res.clone().text();
    const etag = `"${await crypto.subtle.digest('SHA-256', 
      new TextEncoder().encode(body)).then(b => 
        Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
      ).substring(0, 32)}"`;
    
    c.header('ETag', etag);
    
    // If-None-Match チェック
    const ifNoneMatch = c.req.header('If-None-Match');
    if (ifNoneMatch === etag) {
      return c.body(null, 304);
    }
  };
};
```

**効果**: 変更のないリソースの転送をスキップ
**実装難易度**: 中
**予想改善**: 未変更リソースで 50-80%削減

## 実装優先順位

### フェーズ1: 即座に実施可能（1-2週間）

1. **キャッシュTTLの調整** - エンドポイント特性に応じた最適化
2. **キャッシュキーの最適化** - クエリパラメータ正規化
3. **Prepared Statementキャッシュ** - 頻繁なクエリの最適化
4. **並列処理の導入** - 独立クエリの並列実行
5. **パフォーマンスモニタリング** - 計測基盤の構築

**予想効果**: 
- キャッシュヒット時: 10-30ms改善
- キャッシュミス時: 30-80ms改善
- 目標達成率: 70-80%

### フェーズ2: 中期施策（1-2ヶ月）

1. **データベースインデックス最適化** - 複合インデックス追加
2. **N+1クエリの解消** - JOIN活用
3. **ペイロードサイズ削減** - フィールド選択、プレビュー機能
4. **Smart Placement有効化** - レイテンシ削減
5. **メモリ内キャッシュ** - ホットデータのキャッシング

**予想効果**:
- キャッシュミス時: さらに50-100ms改善
- 目標達成率: 90-95%

### フェーズ3: 長期施策（3-6ヶ月）

1. **Read Replica活用** - D1機能提供時
2. **Durable Objects検討** - 高度なキャッシュ戦略
3. **条件付きリクエスト** - ETag/Last-Modified
4. **継続的チューニング** - データに基づく最適化

**予想効果**:
- 全体的なパフォーマンス向上: 20-40ms追加改善
- 目標達成率: 95-99%

## 目標達成のシミュレーション

### 現状推定（本番実績より）

- P50: 80ms
- P90: 250ms（目標: 100ms）
- P99: 800ms（目標: 500ms）

### フェーズ1後の予測

- P50: 50ms（-30ms）
- P90: 120ms（-130ms）✅ **目標達成に近接**
- P99: 500ms（-300ms）✅ **目標達成**

### フェーズ2後の予測

- P50: 30ms（-20ms）
- P90: 70ms（-50ms）✅ **目標を大幅に上回る**
- P99: 350ms（-150ms）✅ **目標を上回る**

### フェーズ3後の予測

- P50: 20ms（-10ms）
- P90: 50ms（-20ms）✅ **目標を大幅に上回る**
- P99: 280ms（-70ms）✅ **目標を大幅に上回る**

## リスクと対策

### リスク1: キャッシュの陳腐化

**対策**: 
- 適切なTTL設定
- 更新時のキャッシュパージ機構
- stale-while-revalidate による透過的な更新

### リスク2: メモリ使用量の増加

**対策**:
- メモリキャッシュのサイズ制限
- LRU（Least Recently Used）によるエビクション
- 定期的なメモリ使用量監視

### リスク3: 複雑性の増加

**対策**:
- 段階的な実装とテスト
- 詳細なドキュメンテーション
- パフォーマンステストの自動化

## 成功の測定基準

1. **レスポンスタイム**
   - P90 < 100ms
   - P99 < 500ms
   - P50 < 50ms（ストレッチゴール）

2. **キャッシュヒット率**
   - 公開エンドポイント: > 80%
   - タグ・メタデータ: > 90%

3. **データベース負荷**
   - クエリ実行時間の平均 < 20ms
   - クエリ数の削減: 30%以上

4. **ユーザー体験**
   - Time to First Byte (TTFB) < 100ms
   - 初回ページロード < 1秒

## まとめ

本計画は、Cloudflareのエコシステム内で実現可能な最適化手法を段階的に実装することで、
目標とするレスポンスタイム（P90: 100ms、P99: 500ms）の達成を目指します。

フェーズ1の施策だけでも目標達成に近づき、フェーズ2でほぼ確実に目標を達成できる見込みです。
継続的なモニタリングとデータドリブンな改善により、さらなるパフォーマンス向上も期待できます。
