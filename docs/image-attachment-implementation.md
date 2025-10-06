# 画像添付機能実装ガイド

## 概要

shumilogに画像添付機能を実装しました。ユーザーはログエントリに画像をアップロードし、Cloudflare R2ストレージに保存できます。この機能により、ログの表現力が大幅に向上します。

## 実装日
2025-01-08

## 技術スタック

- **バックエンド**: Cloudflare Workers + Hono + TypeScript
- **ストレージ**: Cloudflare R2
- **データベース**: Cloudflare D1 (SQLite)
- **フロントエンド**: React 19 + TypeScript + Tailwind CSS

## データベーススキーマ

### log_images テーブル

```sql
CREATE TABLE log_images (
  id TEXT PRIMARY KEY,                    -- UUID
  log_id TEXT NOT NULL,                   -- ログID（外部キー）
  r2_key TEXT NOT NULL,                   -- R2ストレージのキー
  file_name TEXT NOT NULL,                -- 元のファイル名
  content_type TEXT NOT NULL,             -- MIMEタイプ
  file_size INTEGER NOT NULL,             -- バイト単位のサイズ
  width INTEGER,                          -- 画像の幅（ピクセル）
  height INTEGER,                         -- 画像の高さ（ピクセル）
  display_order INTEGER NOT NULL DEFAULT 0, -- 表示順序
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

CREATE INDEX idx_log_images_log_id ON log_images(log_id);
CREATE INDEX idx_log_images_display_order ON log_images(log_id, display_order);
```

### マイグレーション

マイグレーションファイル: `backend/migrations/0004_add_log_images.sql`

```bash
cd backend
npm run db:migrate
```

## APIエンドポイント

### 1. 画像アップロード

```
POST /api/logs/:logId/images
Content-Type: multipart/form-data
Authorization: Required (session cookie)
```

**リクエストボディ**:
- `file` (required): 画像ファイル
- `width` (optional): 画像の幅
- `height` (optional): 画像の高さ
- `display_order` (optional): 表示順序（デフォルト: 0）

**レスポンス** (201):
```json
{
  "id": "uuid",
  "log_id": "log_id",
  "r2_key": "logs/log_id/uuid.jpg",
  "file_name": "example.jpg",
  "content_type": "image/jpeg",
  "file_size": 245678,
  "width": 1920,
  "height": 1080,
  "display_order": 0,
  "created_at": "2025-01-08T10:00:00Z"
}
```

**制約**:
- 最大ファイルサイズ: 10MB
- 対応形式: JPEG, PNG, GIF, WebP
- 認証が必要
- ログの所有者のみアップロード可能

### 2. ログの画像一覧取得

```
GET /api/logs/:logId/images
```

**レスポンス** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "log_id": "log_id",
      "file_name": "example.jpg",
      "content_type": "image/jpeg",
      "file_size": 245678,
      "display_order": 0,
      "created_at": "2025-01-08T10:00:00Z"
    }
  ]
}
```

### 3. 画像ファイル取得

```
GET /api/logs/:logId/images/:imageId
```

**レスポンス** (200):
- Content-Type: 画像のMIMEタイプ
- Body: 画像のバイナリデータ（R2から直接ストリーミング）
- Cache-Control: `public, max-age=31536000, immutable`

### 4. 画像削除

```
DELETE /api/logs/:logId/images/:imageId
Authorization: Required (session cookie)
```

**レスポンス** (204): No Content

**制約**:
- 認証が必要
- ログの所有者のみ削除可能

## バックエンド実装

### ImageModel (`backend/src/models/Image.ts`)

画像データの型定義とユーティリティメソッド:

```typescript
export interface LogImage {
  id: string;
  log_id: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  file_size: number;
  width?: number;
  height?: number;
  display_order: number;
  created_at: string;
}

export class ImageModel {
  static isValidContentType(contentType: string): boolean;
  static getFileExtension(contentType: string): string;
  static fromRow(row: any): LogImage;
}
```

### ImageService (`backend/src/services/ImageService.ts`)

R2との統合とデータベース操作:

```typescript
export class ImageService {
  async uploadImage(logId: string, file: Blob, metadata: CreateImageData): Promise<LogImage>;
  async getLogImages(logId: string): Promise<LogImage[]>;
  async getImage(imageId: string): Promise<LogImage | null>;
  async getImageData(r2Key: string): Promise<R2ObjectBody | null>;
  async deleteImage(imageId: string): Promise<void>;
  async deleteLogImages(logId: string): Promise<void>;
  async updateImageOrder(imageId: string, displayOrder: number): Promise<void>;
}
```

### Log Model の拡張

```typescript
export interface Log {
  // ... 既存のフィールド
  images?: LogImage[];  // 追加
}
```

### R2設定 (`backend/wrangler.toml`)

```toml
# 開発環境
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "shumilog-images-dev"

# ステージング環境
[[env.development.r2_buckets]]
binding = "IMAGES"
bucket_name = "shumilog-images-devel"

# 本番環境
[[env.production.r2_buckets]]
binding = "IMAGES"
bucket_name = "shumilog-images"
```

## フロントエンド実装

### ImageUpload コンポーネント (`frontend/src/components/ImageUpload.tsx`)

画像選択とプレビュー機能を提供:

**機能**:
- ファイル選択UI
- 複数画像の選択とプレビュー
- ファイルタイプ検証（画像のみ）
- ファイルサイズ検証（10MB以下）
- 既存画像の表示
- 画像削除（個別）

**使用例**:
```tsx
<ImageUpload
  logId={log?.id}
  onImagesChange={(files) => setSelectedImages(files)}
  existingImages={log?.images?.map(img => ({
    id: img.id,
    file_name: img.file_name,
    url: `/api/logs/${log.id}/images/${img.id}`,
  }))}
  onDeleteExisting={(imageId) => handleDelete(imageId)}
/>
```

### LogImages コンポーネント (`frontend/src/components/LogImages.tsx`)

ログ詳細ページでの画像表示:

**機能**:
- レスポンシブグリッドレイアウト
- 画像のクリックで拡大（新規タブ）
- ホバー時のズームエフェクト
- 画像情報の表示（ファイル名、サイズ）

**使用例**:
```tsx
<LogImages logId={log.id} images={log.images} />
```

### LogForm の拡張

画像アップロード機能を統合:

```tsx
const [selectedImages, setSelectedImages] = useState<File[]>([]);

// ログ作成/更新後に画像をアップロード
const uploadImages = async (logId: string) => {
  for (let i = 0; i < selectedImages.length; i++) {
    const formData = new FormData();
    formData.append('file', selectedImages[i]);
    formData.append('display_order', i.toString());
    
    await fetch(`/api/logs/${logId}/images`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
  }
};
```

## R2ストレージ構造

画像は以下のパス構造で保存されます:

```
logs/
  {logId}/
    {imageId}.{extension}
```

例:
```
logs/log_alice_1/abc123-def456.jpg
logs/log_alice_1/789xyz-012uvw.png
```

### R2メタデータ

各オブジェクトには以下のメタデータが付与されます:

```typescript
{
  httpMetadata: {
    contentType: 'image/jpeg'
  },
  customMetadata: {
    logId: 'log_alice_1',
    imageId: 'abc123-def456',
    fileName: 'example.jpg'
  }
}
```

## 本番環境へのデプロイ

### 1. R2バケットの作成

```bash
# 本番環境
wrangler r2 bucket create shumilog-images --env production

# ステージング環境
wrangler r2 bucket create shumilog-images-devel --env development
```

### 2. マイグレーションの実行

```bash
# 本番環境
wrangler d1 migrations apply shumilog-db --env production

# ステージング環境
wrangler d1 migrations apply shumilog-db-devel --env development
```

### 3. デプロイ

```bash
cd backend
wrangler deploy --env production
```

## セキュリティ考慮事項

1. **認証・認可**
   - 画像アップロードには認証が必須
   - 画像削除はログの所有者のみ可能
   - 画像取得（GET）は認証不要（公開ログの画像は誰でも閲覧可能）

2. **ファイル検証**
   - MIMEタイプのチェック（画像形式のみ許可）
   - ファイルサイズの制限（10MB）
   - ファイル拡張子の検証

3. **R2アクセス**
   - 画像はWorker経由でのみアクセス可能
   - 直接R2 URLは公開されない
   - キャッシュヘッダーで効率的な配信

## パフォーマンス

1. **画像配信**
   - R2からのストリーミング配信
   - 1年間のキャッシュ設定（immutable）
   - CDNキャッシュの活用

2. **データベースクエリ**
   - インデックスによる高速検索
   - ログ取得時に画像も一括取得（N+1問題の回避）

3. **フロントエンド**
   - 画像のlazy loading
   - レスポンシブ画像の使用
   - プレビュー時のオブジェクトURL活用

## テスト

### ユニットテスト

```bash
cd backend
npm test
```

すべてのテストが成功することを確認（250 passed）

### 手動テスト手順

1. **画像アップロード**
   ```bash
   # セッション作成
   cd backend
   npm run dev:create-session alice
   
   # 画像アップロード
   curl -X POST http://localhost:8787/api/logs/log_alice_1/images \
     -H "Cookie: session=YOUR_SESSION_TOKEN" \
     -F "file=@/path/to/image.jpg" \
     -F "display_order=0"
   ```

2. **画像一覧取得**
   ```bash
   curl http://localhost:8787/api/logs/log_alice_1/images
   ```

3. **画像取得**
   ```bash
   curl http://localhost:8787/api/logs/log_alice_1/images/IMAGE_ID > image.jpg
   ```

4. **画像削除**
   ```bash
   curl -X DELETE http://localhost:8787/api/logs/log_alice_1/images/IMAGE_ID \
     -H "Cookie: session=YOUR_SESSION_TOKEN"
   ```

## トラブルシューティング

### R2バケットが存在しない

**エラー**: `R2 bucket not configured`

**解決策**:
1. R2バケットを作成
2. `wrangler.toml`の設定を確認
3. Workerを再起動

### 画像アップロードが失敗

**原因と解決策**:

1. **ファイルサイズ超過**
   - 10MB以下のファイルを使用

2. **対応していない形式**
   - JPEG, PNG, GIF, WebP のみ対応

3. **認証エラー**
   - 有効なセッションが必要
   - ログの所有者であることを確認

### 画像が表示されない

**チェックポイント**:
1. データベースに画像レコードが存在するか
2. R2に実際のファイルが保存されているか
3. R2キーが正しいか
4. ブラウザのコンソールでエラーを確認

## 今後の拡張案

1. **画像最適化**
   - Cloudflare Imagesとの統合
   - 自動リサイズ・圧縮
   - WebP変換

2. **UI改善**
   - ドラッグ&ドロップ対応
   - 画像の並び替え
   - 画像へのキャプション追加
   - 一括アップロード進捗バー

3. **機能拡張**
   - 画像の編集（トリミング、回転）
   - サムネイル生成
   - 画像メタデータの抽出（EXIF）

4. **パフォーマンス**
   - 画像のプリロード
   - プログレッシブ読み込み
   - WebP形式の優先使用

## 参考リンク

- [Cloudflare R2 ドキュメント](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Hono フレームワーク](https://hono.dev/)
- [OpenAPI 仕様](../../api/v1/openapi.yaml)

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-01-08 | 1.0.0 | 初版リリース - 画像添付機能の実装 |
