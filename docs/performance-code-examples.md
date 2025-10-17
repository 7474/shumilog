# パフォーマンス改善コード例

このドキュメントは、`performance-improvement-plan.md` で提案された改善策の具体的なコード実装例を示します。

---

## 1. データベースクエリ最適化

### 1.1 ログとタグの一括取得（現在の実装の改善）

#### 現在の実装（推測）

```typescript
// backend/src/services/LogService.ts

async enrichLogsWithTags(logRows: any[]): Promise<Log[]> {
  const logs: Log[] = [];
  
  for (const row of logRows) {
    // 各ログに対して個別にタグを取得（N+1問題）
    const tags = await this.db.query<Tag>(
      'SELECT t.* FROM tags t JOIN log_tag_associations lta ON t.id = lta.tag_id WHERE lta.log_id = ?',
      [row.id]
    );
    
    const user: User = {
      id: row.user_id,
      twitter_username: row.twitter_username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      created_at: row.user_created_at,
    };
    
    logs.push(LogModel.fromRow(row, user, tags));
  }
  
  return logs;
}
```

#### 改善後の実装

```typescript
// backend/src/services/LogService.ts

/**
 * ログにタグと画像を付加（一括取得による最適化版）
 */
async enrichLogsWithTags(logRows: any[]): Promise<Log[]> {
  if (logRows.length === 0) {
    return [];
  }
  
  // 全ログIDを収集
  const logIds = logRows.map(row => row.id);
  const placeholders = logIds.map(() => '?').join(',');
  
  // 1回のクエリで全ログのタグを取得
  const tagAssociations = await this.db.query<{
    log_id: string;
    tag_id: string;
    tag_name: string;
    tag_description: string;
    tag_metadata: string;
    tag_created_by: string;
    tag_created_at: string;
    tag_updated_at: string;
  }>(
    `SELECT 
      lta.log_id,
      t.id as tag_id,
      t.name as tag_name,
      t.description as tag_description,
      t.metadata as tag_metadata,
      t.created_by as tag_created_by,
      t.created_at as tag_created_at,
      t.updated_at as tag_updated_at
    FROM log_tag_associations lta
    JOIN tags t ON lta.tag_id = t.id
    WHERE lta.log_id IN (${placeholders})
    ORDER BY t.name ASC`,
    logIds
  );
  
  // 1回のクエリで全ログの画像を取得
  const images = await this.db.query<{
    log_id: string;
    id: string;
    filename: string;
    content_type: string;
    size: number;
    display_order: number;
    uploaded_at: string;
  }>(
    `SELECT 
      log_id,
      id,
      filename,
      content_type,
      size,
      display_order,
      uploaded_at
    FROM images
    WHERE log_id IN (${placeholders})
    ORDER BY display_order ASC, uploaded_at ASC`,
    logIds
  );
  
  // ログIDをキーにしたマップを作成
  const tagsByLogId = new Map<string, Tag[]>();
  const imagesByLogId = new Map<string, LogImage[]>();
  
  // タグをログIDでグループ化
  for (const assoc of tagAssociations) {
    const tag: Tag = {
      id: assoc.tag_id,
      name: assoc.tag_name,
      description: assoc.tag_description || '',
      metadata: JSON.parse(assoc.tag_metadata || '{}'),
      created_by: assoc.tag_created_by,
      created_at: assoc.tag_created_at,
      updated_at: assoc.tag_updated_at,
    };
    
    if (!tagsByLogId.has(assoc.log_id)) {
      tagsByLogId.set(assoc.log_id, []);
    }
    tagsByLogId.get(assoc.log_id)!.push(tag);
  }
  
  // 画像をログIDでグループ化
  for (const image of images) {
    const logImage: LogImage = {
      id: image.id,
      filename: image.filename,
      content_type: image.content_type,
      size: image.size,
      display_order: image.display_order,
      uploaded_at: image.uploaded_at,
    };
    
    if (!imagesByLogId.has(image.log_id)) {
      imagesByLogId.set(image.log_id, []);
    }
    imagesByLogId.get(image.log_id)!.push(logImage);
  }
  
  // ログオブジェクトを構築
  return logRows.map(row => {
    const user: User = {
      id: row.user_id,
      twitter_username: row.twitter_username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      created_at: row.user_created_at,
    };
    
    const tags = tagsByLogId.get(row.id) || [];
    const logImages = imagesByLogId.get(row.id) || [];
    
    return LogModel.fromRow(row, user, tags, logImages);
  });
}
```

**改善点**:
- N+1クエリ問題を解消（10件のログで11回 → 3回のクエリ）
- 画像も同時に取得
- メモリ効率的なグループ化処理

---

### 1.2 データベースインデックスの追加

#### マイグレーションファイル

```sql
-- backend/migrations/XXXX_add_performance_indexes.sql

-- タグ名での検索を高速化
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- ログとタグの関連付けを高速化
CREATE INDEX IF NOT EXISTS idx_log_tag_associations_log_id 
  ON log_tag_associations(log_id);
CREATE INDEX IF NOT EXISTS idx_log_tag_associations_tag_id 
  ON log_tag_associations(tag_id);

-- 画像取得を高速化
CREATE INDEX IF NOT EXISTS idx_images_log_id ON images(log_id);
CREATE INDEX IF NOT EXISTS idx_images_display_order 
  ON images(log_id, display_order);

-- 公開ログの検索を高速化（複合インデックス）
CREATE INDEX IF NOT EXISTS idx_logs_public_created 
  ON logs(is_public, created_at DESC);

-- ユーザーの公開ログ検索を高速化
CREATE INDEX IF NOT EXISTS idx_logs_user_public_created 
  ON logs(user_id, is_public, created_at DESC);

-- タグの使用頻度計算を高速化
CREATE INDEX IF NOT EXISTS idx_log_tag_associations_tag_created 
  ON log_tag_associations(tag_id, created_at);
```

#### マイグレーション適用方法

```bash
# 開発環境
cd backend
npm run db:migrate

# 本番環境（Cloudflare Workers）
wrangler d1 migrations apply shumilog-db --remote
```

---

## 2. フロントエンドの並列データフェッチ

### 2.1 ログ詳細ページの改善

#### 現在の実装（推測）

```tsx
// frontend/src/pages/LogDetailPage.tsx

export function LogDetailPage() {
  const { id } = useParams();
  const [log, setLog] = useState<Log | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // 逐次取得（ウォーターフォール）
      const { data: logData } = await api.GET('/logs/{id}', {
        params: { path: { id: id! } }
      });
      setLog(logData);
      
      const { data: relatedData } = await api.GET('/logs/{id}/related', {
        params: { path: { id: id! } }
      });
      setRelatedLogs(relatedData);
      
      setLoading(false);
    }
    
    if (id) {
      fetchData();
    }
  }, [id]);
  
  // ...
}
```

#### 改善後の実装

```tsx
// frontend/src/pages/LogDetailPage.tsx

export function LogDetailPage() {
  const { id } = useParams();
  const [log, setLog] = useState<Log | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 並列取得
        const [logResponse, relatedResponse] = await Promise.all([
          api.GET('/logs/{id}', {
            params: { path: { id } }
          }),
          api.GET('/logs/{id}/related', {
            params: { path: { id } }
          })
        ]);
        
        if (logResponse.error) {
          throw new Error('ログの取得に失敗しました');
        }
        if (relatedResponse.error) {
          // 関連ログの取得失敗は致命的ではない
          console.warn('関連ログの取得に失敗しました', relatedResponse.error);
        }
        
        setLog(logResponse.data);
        setRelatedLogs(relatedResponse.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [id]);
  
  // ...
}
```

**改善点**:
- `Promise.all` で並列取得
- エラーハンドリングの改善
- 関連ログ取得失敗時も致命的エラーとしない

---

### 2.2 カスタムフック化

```typescript
// frontend/src/hooks/useLogDetails.ts

interface UseLogDetailsResult {
  log: Log | null;
  relatedLogs: Log[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLogDetails(logId: string | undefined): UseLogDetailsResult {
  const [log, setLog] = useState<Log | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!logId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [logResponse, relatedResponse] = await Promise.all([
        api.GET('/logs/{id}', {
          params: { path: { id: logId } }
        }),
        api.GET('/logs/{id}/related', {
          params: { path: { id: logId } }
        })
      ]);
      
      if (logResponse.error) {
        throw new Error('ログの取得に失敗しました');
      }
      
      setLog(logResponse.data);
      setRelatedLogs(relatedResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [logId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { log, relatedLogs, loading, error, refetch: fetchData };
}
```

**使用例**:
```tsx
export function LogDetailPage() {
  const { id } = useParams();
  const { log, relatedLogs, loading, error } = useLogDetails(id);
  
  // ...
}
```

---

## 3. スケルトンスクリーン実装

### 3.1 ログカードスケルトン

```tsx
// frontend/src/components/LogCardSkeleton.tsx

export function LogCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      {/* タイトル */}
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
      
      {/* コンテンツ（3行） */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      
      {/* タグ */}
      <div className="flex gap-2 mb-3">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-18"></div>
      </div>
      
      {/* ユーザー情報 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
      </div>
    </div>
  );
}
```

### 3.2 ログ一覧でのスケルトン使用

```tsx
// frontend/src/pages/LogsPage.tsx

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ... fetchLogs などの処理
  
  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">趣味ログ</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* スケルトンを複数表示 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <LogCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">趣味ログ</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {logs.map(log => (
          <LogCard key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
```

---

## 4. 画像遅延読み込み

### 4.1 ネイティブLazy Loading

```tsx
// frontend/src/components/LogImage.tsx

interface LogImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LogImage({ src, alt, className }: LogImageProps) {
  return (
    <img 
      src={src} 
      alt={alt}
      loading="lazy"  // ブラウザネイティブの遅延読み込み
      className={className}
      onError={(e) => {
        // 画像読み込みエラー時のフォールバック
        e.currentTarget.src = '/placeholder-image.svg';
      }}
    />
  );
}
```

### 4.2 Intersection Observer を使った高度な実装

```tsx
// frontend/src/components/LazyImage.tsx

import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  rootMargin?: string; // 画面外どのくらいで読み込むか
}

export function LazyImage({ 
  src, 
  alt, 
  className = '',
  placeholder = '/placeholder-image.svg',
  rootMargin = '200px' 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!imgRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    
    observer.observe(imgRef.current);
    
    return () => observer.disconnect();
  }, [rootMargin]);
  
  const handleLoad = () => {
    setIsLoaded(true);
  };
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image load error:', src);
    e.currentTarget.src = placeholder;
  };
  
  return (
    <div className={`relative ${className}`}>
      <img 
        ref={imgRef}
        src={isInView ? src : placeholder}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}
```

**使用例**:
```tsx
<LazyImage 
  src="/api/images/abc123.jpg"
  alt="ログ画像"
  className="w-full h-64 object-cover rounded-lg"
  rootMargin="300px" // 画面外300pxで読み込み開始
/>
```

---

## 5. Optimistic UI Updates

### 5.1 ログ作成の楽観的更新

```tsx
// frontend/src/pages/LogsPage.tsx

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const { user } = useAuth();
  
  const handleCreateLog = async (data: CreateLogData) => {
    // 1. 一時的なIDで即座にUIに反映
    const tempId = `temp-${Date.now()}`;
    const tempLog: Log = {
      id: tempId,
      user_id: user!.id,
      user: user!,
      title: data.title,
      content_md: data.content_md,
      is_public: data.is_public ?? true,
      associated_tags: [], // タグは後で解決
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      images: [],
    };
    
    // UIを即座に更新
    setLogs(prev => [tempLog, ...prev]);
    
    try {
      // 2. サーバーに送信
      const { data: createdLog, error } = await api.POST('/logs', {
        body: data
      });
      
      if (error) {
        throw new Error('ログの作成に失敗しました');
      }
      
      // 3. 実際のデータで置き換え
      setLogs(prev => prev.map(log => 
        log.id === tempId ? createdLog : log
      ));
      
      // 成功通知
      showToast('ログを作成しました', 'success');
    } catch (err) {
      // 4. エラー時はロールバック
      setLogs(prev => prev.filter(log => log.id !== tempId));
      showToast(
        err instanceof Error ? err.message : 'ログの作成に失敗しました',
        'error'
      );
    }
  };
  
  // ...
}
```

### 5.2 いいね機能の楽観的更新（将来実装時）

```tsx
// frontend/src/components/LogCard.tsx

interface LogCardProps {
  log: Log;
  onLike?: (logId: string, liked: boolean) => Promise<void>;
}

export function LogCard({ log, onLike }: LogCardProps) {
  const [isLiked, setIsLiked] = useState(log.is_liked);
  const [likeCount, setLikeCount] = useState(log.like_count);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleLike = async () => {
    if (isProcessing) return;
    
    const newLiked = !isLiked;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    
    // 楽観的更新
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    setIsProcessing(true);
    
    try {
      await onLike?.(log.id, newLiked);
    } catch (err) {
      // エラー時はロールバック
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      showToast('いいねに失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="log-card">
      {/* ... */}
      <button 
        onClick={handleLike}
        disabled={isProcessing}
        className={isLiked ? 'text-red-500' : 'text-gray-500'}
      >
        <Heart className={isLiked ? 'fill-current' : ''} />
        {likeCount}
      </button>
    </div>
  );
}
```

---

## 6. コンポーネントのメモ化

### 6.1 LogCard のメモ化

```tsx
// frontend/src/components/LogCard.tsx

import React from 'react';

interface LogCardProps {
  log: Log;
  onClick?: (logId: string) => void;
}

export const LogCard = React.memo(({ log, onClick }: LogCardProps) => {
  const handleClick = () => {
    onClick?.(log.id);
  };
  
  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* タイトル */}
      {log.title && (
        <h3 className="text-xl font-bold mb-2">{log.title}</h3>
      )}
      
      {/* コンテンツプレビュー */}
      <div className="text-gray-700 mb-3 line-clamp-3">
        {log.content_md.substring(0, 150)}...
      </div>
      
      {/* タグ */}
      {log.associated_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {log.associated_tags.map(tag => (
            <span 
              key={tag.id}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}
      
      {/* ユーザー情報 */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {log.user.avatar_url && (
          <img 
            src={log.user.avatar_url}
            alt={log.user.display_name}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span>{log.user.display_name}</span>
        <span className="ml-auto">{formatDate(log.created_at)}</span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 再レンダリングが必要かを判定
  return (
    prevProps.log.id === nextProps.log.id &&
    prevProps.log.updated_at === nextProps.log.updated_at &&
    prevProps.onClick === nextProps.onClick
  );
});

LogCard.displayName = 'LogCard';
```

### 6.2 useMemo と useCallback の活用

```tsx
// frontend/src/pages/LogsPage.tsx

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // フィルタリング結果をメモ化
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.title?.toLowerCase().includes(query) ||
      log.content_md.toLowerCase().includes(query) ||
      log.associated_tags.some(tag => tag.name.toLowerCase().includes(query))
    );
  }, [logs, searchQuery]);
  
  // コールバック関数をメモ化
  const handleLogClick = useCallback((logId: string) => {
    navigate(`/logs/${logId}`);
  }, [navigate]);
  
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // 検索処理
  }, []);
  
  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch}>
        <Input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ログを検索..."
        />
      </form>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLogs.map(log => (
          <LogCard 
            key={log.id} 
            log={log}
            onClick={handleLogClick}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 7. アプリケーションレベルキャッシュ

### 7.1 シンプルなメモリキャッシュ実装

```typescript
// backend/src/cache/CacheManager.ts

interface CacheItem<T> {
  data: T;
  expiry: number;
}

export class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // 定期的に期限切れアイテムをクリーンアップ（1分ごと）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }
  
  /**
   * キャッシュから取得
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  /**
   * キャッシュに保存
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }
  
  /**
   * キャッシュから削除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * パターンマッチでキャッシュを削除
   */
  deletePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
  
  /**
   * 期限切れアイテムをクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * クリーンアップタイマーを停止
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
  
  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
```

### 7.2 キャッシュの使用例

```typescript
// backend/src/services/LogService.ts

export class LogService {
  private cacheManager: CacheManager;
  
  constructor(private db: Database, cacheManager?: CacheManager) {
    this.cacheManager = cacheManager || new CacheManager();
  }
  
  /**
   * 公開ログ一覧を取得（キャッシュ対応）
   */
  async getPublicLogs(limit = 20, offset = 0): Promise<LogSearchResult> {
    const cacheKey = `public_logs:${limit}:${offset}`;
    
    // キャッシュから取得を試みる
    const cached = this.cacheManager.get<LogSearchResult>(cacheKey);
    if (cached) {
      console.log('Cache hit:', cacheKey);
      return cached;
    }
    
    // キャッシュミス - データベースから取得
    console.log('Cache miss:', cacheKey);
    const result = await this.searchLogs({ 
      is_public: true, 
      limit, 
      offset 
    });
    
    // キャッシュに保存（TTL: 1分）
    this.cacheManager.set(cacheKey, result, 60);
    
    return result;
  }
  
  /**
   * ログ作成時にキャッシュを無効化
   */
  async createLog(data: CreateLogData, userId: string): Promise<Log> {
    const log = await this.createLogInternal(data, userId);
    
    // 関連するキャッシュを無効化
    this.cacheManager.deletePattern(/^public_logs:/);
    this.cacheManager.deletePattern(new RegExp(`^user_logs:${userId}:`));
    
    for (const tagId of log.associated_tags.map(t => t.id)) {
      this.cacheManager.deletePattern(new RegExp(`^tag_logs:${tagId}:`));
    }
    
    return log;
  }
}
```

---

## 8. パフォーマンス測定コード

### 8.1 バックエンド測定ミドルウェア

```typescript
// backend/src/middleware/performance.ts

import { Context, Next } from 'hono';

export const performanceLogger = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const path = new URL(c.req.url).pathname;
    const method = c.req.method;
    
    await next();
    
    const duration = Date.now() - start;
    const status = c.res.status;
    
    // パフォーマンスログ
    console.log(JSON.stringify({
      type: 'performance',
      method,
      path,
      status,
      duration,
      timestamp: new Date().toISOString()
    }));
    
    // レスポンスヘッダーに追加
    c.header('X-Response-Time', `${duration}ms`);
    
    // 遅いリクエストを警告
    if (duration > 1000) {
      console.warn(`Slow request: ${method} ${path} - ${duration}ms`);
    }
  };
};
```

### 8.2 フロントエンド測定フック

```typescript
// frontend/src/hooks/usePerformance.ts

export function usePerformance(metricName: string) {
  useEffect(() => {
    const markName = `${metricName}-start`;
    performance.mark(markName);
    
    return () => {
      const endMarkName = `${metricName}-end`;
      performance.mark(endMarkName);
      
      try {
        performance.measure(metricName, markName, endMarkName);
        const measure = performance.getEntriesByName(metricName)[0];
        
        console.log(`Performance [${metricName}]:`, {
          duration: measure.duration,
          startTime: measure.startTime
        });
        
        // 遅い操作を警告
        if (measure.duration > 100) {
          console.warn(`Slow operation: ${metricName} - ${measure.duration}ms`);
        }
      } catch (err) {
        console.error('Performance measurement failed:', err);
      } finally {
        performance.clearMarks(markName);
        performance.clearMarks(endMarkName);
        performance.clearMeasures(metricName);
      }
    };
  }, [metricName]);
}
```

**使用例**:
```tsx
export function LogsPage() {
  usePerformance('LogsPage-Render');
  
  // ...
}
```

---

## まとめ

このドキュメントで示したコード例を参考に、段階的にパフォーマンス改善を実装してください。各改善策は独立しているため、優先度に応じて実装順序を調整できます。

**推奨実装順序**:
1. データベースインデックス追加（即効性・低リスク）
2. フロントエンド並列データフェッチ（効果大・低リスク）
3. スケルトンスクリーン（体感改善・低リスク）
4. データベースクエリ一括化（効果大・中リスク）
5. 画像遅延読み込み（効果中・低リスク）
6. コンポーネントメモ化（継続的改善）
7. アプリケーションキャッシュ（高度な最適化）
8. Optimistic UI（体感改善・中リスク）
