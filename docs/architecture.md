# Shumilog システムアーキテクチャ

本ドキュメントは、Shumilog（趣味コンテンツログサービス）のシステム全体構成を概観するための資料です。

## 目次

1. [システム概要](#システム概要)
2. [システム全体構成](#システム全体構成)
3. [コンポーネント構成](#コンポーネント構成)
4. [データベース設計](#データベース設計)
5. [デプロイメント構成](#デプロイメント構成)
6. [API通信フロー](#api通信フロー)
7. [認証フロー](#認証フロー)

---

## システム概要

Shumilogは、趣味コンテンツのログを記録・共有するためのWebアプリケーションです。Cloudflareのエッジプラットフォーム上で動作し、高速かつスケーラブルなサービスを提供します。

### 主要技術スタック

- **フロントエンド**: React 19 + Vite 7 + Tailwind CSS 4.1 + shadcn/ui
- **バックエンド**: Cloudflare Workers + Hono
- **データベース**: Cloudflare D1 (SQLite)
- **セッションストア**: Cloudflare KV
- **ストレージ**: Cloudflare R2
- **SSR**: Cloudflare Pages Functions
- **言語**: TypeScript 5.9+
- **ランタイム**: Node.js 22 LTS

---

## システム全体構成

```mermaid
graph TB
    subgraph "クライアント"
        Browser[Webブラウザ]
        Bot[OGPボット<br/>Twitter, Facebook, Slack]
    end
    
    subgraph "Cloudflare Edge Network"
        subgraph "Cloudflare Pages"
            PagesFunctions[Pages Functions<br/>SSRミドルウェア]
            StaticAssets[静的アセット<br/>HTML/CSS/JS]
        end
        
        subgraph "Cloudflare Workers"
            API[API Worker<br/>Hono Framework]
        end
        
        subgraph "Cloudflare D1"
            Database[(D1 Database<br/>SQLite)]
        end
        
        subgraph "Cloudflare KV"
            SessionStore[(KV Namespace<br/>セッションストア)]
        end
        
        subgraph "Cloudflare R2"
            Storage[R2 Storage<br/>画像ファイル]
        end
    end
    
    subgraph "外部サービス"
        Twitter[Twitter OAuth API]
    end
    
    Browser -->|HTTPS| PagesFunctions
    Bot -->|HTTPS| PagesFunctions
    PagesFunctions -->|通常リクエスト| StaticAssets
    PagesFunctions -->|ボット検出時| API
    Browser -->|API呼び出し| API
    API --> Database
    API --> SessionStore
    API --> Storage
    API -->|OAuth| Twitter
    
    style Browser fill:#e1f5ff
    style Bot fill:#fff3e0
    style PagesFunctions fill:#c8e6c9
    style API fill:#b39ddb
    style Database fill:#ffccbc
    style SessionStore fill:#f8bbd0
    style Storage fill:#ffccbc
    style Twitter fill:#bbdefb
```

### システムの特徴

- **エッジファースト**: すべてのコンポーネントがCloudflareのエッジネットワーク上で動作
- **軽量SSR**: Pages Functionsによる最小限のSSR実装
- **API駆動**: フロントエンドとバックエンドの明確な分離
- **スケーラブル**: サーバーレスアーキテクチャによる自動スケーリング

---

## コンポーネント構成

### フロントエンド構成

```mermaid
graph TB
    subgraph "Frontend Application"
        subgraph "Pages Functions (SSR)"
            Middleware[_middleware.ts<br/>ボット検出・OGP生成]
        end
        
        subgraph "React Application"
            Router[Router.tsx<br/>ルーティング]
            
            subgraph "Pages"
                Home[HomePage]
                LogList[LogListPage]
                LogDetail[LogDetailPage]
                TagList[TagListPage]
                TagDetail[TagDetailPage]
                NewLog[NewLogPage]
                Profile[ProfilePage]
            end
            
            subgraph "Components"
                UIComponents[shadcn/ui<br/>コンポーネント]
                CustomComponents[カスタム<br/>コンポーネント]
                ImageUpload[ImageUpload<br/>画像アップロード]
                LogImages[LogImages<br/>画像表示]
            end
            
            subgraph "Services"
                APIClient[API Client<br/>HTTP通信]
                AuthService[Auth Service<br/>認証管理]
            end
            
            subgraph "Hooks"
                CustomHooks[カスタムフック<br/>状態管理・副作用]
            end
        end
    end
    
    Middleware -.->|ボット以外| Router
    Router --> Pages
    Pages --> Components
    Components --> Services
    Components --> Hooks
    Services -->|API呼び出し| BackendAPI[Backend API]
    
    style Middleware fill:#c8e6c9
    style Router fill:#b39ddb
    style Pages fill:#ffccbc
    style Components fill:#fff9c4
    style Services fill:#f8bbd0
    style Hooks fill:#d1c4e9
```

### バックエンド構成

```mermaid
graph TB
    subgraph "Backend API (Cloudflare Worker)"
        Index[index.ts<br/>Honoアプリケーション]
        
        subgraph "Middleware"
            CORS[CORS]
            Auth[認証ミドルウェア]
            ErrorHandler[エラーハンドリング]
        end
        
        subgraph "Routes"
            HealthRoute["/health"]
            AuthRoutes["/auth/*<br/>Twitter OAuth"]
            UserRoutes["/users/*"]
            LogRoutes["/logs/*"]
            TagRoutes["/tags/*"]
            ImageRoutes["/images/*"]
            SearchRoute["/search"]
        end
        
        subgraph "Services"
            UserService[UserService]
            LogService[LogService]
            TagService[TagService]
            ImageService[ImageService]
            SessionService[SessionService]
            SearchService[SearchService]
        end
        
        subgraph "Models"
            UserModel[User]
            LogModel[Log]
            TagModel[Tag]
            ImageModel[Image]
            SessionModel[Session]
        end
        
        subgraph "Database"
            DB[(D1 Database)]
        end
        
        subgraph "Storage"
            R2[(R2 Storage)]
        end
    end
    
    Index --> Middleware
    Middleware --> Routes
    Routes --> Services
    Services --> Models
    Models --> DB
    ImageService --> R2
    
    style Index fill:#b39ddb
    style Middleware fill:#c8e6c9
    style Routes fill:#ffccbc
    style Services fill:#fff9c4
    style Models fill:#f8bbd0
    style DB fill:#bbdefb
    style R2 fill:#bbdefb
```

---

## データベース設計

### エンティティ関連図 (ERD)

```mermaid
erDiagram
    users ||--o{ logs : "creates"
    users ||--o{ tags : "creates"
    logs ||--o{ log_tag_associations : "has"
    tags ||--o{ log_tag_associations : "belongs to"
    tags ||--o{ tag_associations : "associates with"
    tags ||--o{ tag_associations : "associated by"
    logs ||--o{ log_images : "has"
    images ||--o{ log_images : "belongs to"
    
    users {
        TEXT id PK
        TEXT twitter_username
        TEXT display_name
        TEXT avatar_url
        TEXT created_at
    }
    
    logs {
        TEXT id PK
        TEXT user_id FK
        TEXT title
        TEXT content_md
        INTEGER is_public
        TEXT created_at
        TEXT updated_at
    }
    
    tags {
        TEXT id PK
        TEXT name
        TEXT description
        TEXT metadata
        TEXT created_by FK
        TEXT created_at
        TEXT updated_at
    }
    
    log_tag_associations {
        TEXT log_id PK_FK
        TEXT tag_id PK_FK
    }
    
    tag_associations {
        TEXT tag_id PK_FK
        TEXT associated_tag_id PK_FK
        INTEGER display_order
        TEXT created_at
    }
    
    images {
        TEXT id PK
        TEXT user_id FK
        TEXT filename
        TEXT content_type
        INTEGER size_bytes
        TEXT r2_key
        TEXT created_at
    }
    
    log_images {
        TEXT log_id PK_FK
        TEXT image_id PK_FK
        INTEGER display_order
    }
```

### データモデルの特徴

- **ユーザー管理**: Twitter OAuth認証による最小限のユーザー情報
- **コンテンツ**: Markdown形式のログエントリ（最大10,000文字）
- **タグシステム**: 柔軟なタグ付けと関連付け
- **画像管理**: R2ストレージとの連携によるメタデータ管理

### セッション管理（Cloudflare KV）

セッション情報はCloudflare KVに保存され、D1データベースからは分離されています：

**保存形式:**
- キー: `session:{token}` - セッショントークンからセッション情報を取得
- キー: `user_sessions:{user_id}` - ユーザーIDから複数セッションを管理

**セッションデータ構造:**
```json
{
  "token": "セッショントークン",
  "user_id": "ユーザーID",
  "created_at": "作成日時（ISO 8601）",
  "expires_at": "有効期限（ISO 8601）"
}
```

**特徴:**
- **自動期限切れ**: KVのTTL機能により、期限切れセッションは自動削除
- **高速アクセス**: エッジキャッシュされ、D1よりも低レイテンシ
- **グローバル分散**: Cloudflareのエッジネットワーク全体で利用可能

---

## デプロイメント構成

```mermaid
graph TB
    subgraph "GitHub"
        Repo[GitHubリポジトリ<br/>7474/shumilog]
    end
    
    subgraph "GitHub Actions CI/CD"
        Workflow[Deploy Workflow]
    end
    
    subgraph "Cloudflare Platform"
        subgraph "Production Environment"
            PagesProduction[Pages<br/>shumilog.dev]
            WorkersProduction[Workers<br/>API]
            D1Production[(D1 Database<br/>Production)]
            R2Production[R2 Bucket<br/>Images]
        end
        
        subgraph "Development Environment"
            PagesPreview[Pages<br/>Preview Branches]
            LocalWorkers[Wrangler Local<br/>Development]
            D1Local[(D1 Database<br/>Local)]
        end
    end
    
    subgraph "開発者ワークステーション"
        LocalDev[ローカル開発環境<br/>Node.js 22 LTS]
    end
    
    Repo -->|Push to master| Workflow
    Workflow -->|Deploy| PagesProduction
    Workflow -->|Deploy| WorkersProduction
    PagesProduction --> D1Production
    WorkersProduction --> D1Production
    WorkersProduction --> R2Production
    
    Repo -->|Push to feature branch| PagesPreview
    
    LocalDev -->|npm run dev| LocalWorkers
    LocalWorkers --> D1Local
    
    style Repo fill:#e1f5ff
    style Workflow fill:#c8e6c9
    style PagesProduction fill:#b39ddb
    style WorkersProduction fill:#b39ddb
    style D1Production fill:#ffccbc
    style R2Production fill:#ffccbc
    style LocalDev fill:#fff9c4
```

### デプロイメントフロー

1. **ローカル開発**
   - Wrangler CLI + Viteによる開発サーバー
   - ローカルD1データベースでの開発
   - ホットリロードによる高速イテレーション

2. **継続的デプロイ (CD)**
   - masterブランチへのマージで自動デプロイ
   - GitHub Actionsによるビルド・テスト・デプロイ
   - プレビューデプロイメント（フィーチャーブランチ）

3. **本番環境**
   - Cloudflare Pages: フロントエンド + SSR
   - Cloudflare Workers: APIバックエンド
   - 自動スケーリング・グローバルCDN

---

## API通信フロー

### 標準的なAPI呼び出しフロー

```mermaid
sequenceDiagram
    participant Browser as ブラウザ
    participant Pages as Pages Functions
    participant Worker as API Worker
    participant D1 as D1 Database
    participant R2 as R2 Storage
    
    Browser->>Pages: GET /logs/123
    
    alt ボット検出
        Pages->>Worker: API呼び出し（SSR用）
        Worker->>D1: データ取得
        D1-->>Worker: ログデータ
        Worker-->>Pages: JSONレスポンス
        Pages-->>Browser: SSR HTML（OGP付き）
    else 通常ブラウザ
        Pages-->>Browser: 静的HTML
        Browser->>Worker: GET /api/logs/123
        Worker->>D1: SELECT FROM logs WHERE id = ?
        D1-->>Worker: ログデータ
        
        opt 画像がある場合
            Browser->>Worker: GET /api/images/456
            Worker->>R2: 画像取得
            R2-->>Worker: 画像データ
            Worker-->>Browser: 画像
        end
        
        Worker-->>Browser: JSONレスポンス
    end
```

### API エンドポイント一覧

| エンドポイント | メソッド | 説明 | 認証 |
|--------------|---------|------|------|
| `/health` | GET | ヘルスチェック | 不要 |
| `/auth/twitter` | GET | Twitter OAuth開始 | 不要 |
| `/auth/callback` | GET | OAuth コールバック | 不要 |
| `/auth/logout` | POST | ログアウト | 必要 |
| `/users/me` | GET | 現在のユーザー情報 | 必要 |
| `/users/{id}` | GET | ユーザー情報取得 | 不要 |
| `/logs` | GET | ログ一覧取得 | 不要 |
| `/logs` | POST | ログ作成 | 必要 |
| `/logs/{id}` | GET | ログ詳細取得 | 不要 |
| `/logs/{id}` | PUT | ログ更新 | 必要 |
| `/logs/{id}` | DELETE | ログ削除 | 必要 |
| `/tags` | GET | タグ一覧取得 | 不要 |
| `/tags` | POST | タグ作成 | 必要 |
| `/tags/{id}` | GET | タグ詳細取得 | 不要 |
| `/images` | POST | 画像アップロード | 必要 |
| `/images/{id}` | GET | 画像取得 | 不要 |
| `/search` | GET | 全文検索 | 不要 |

---

## 認証フロー

### Twitter OAuth 認証フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Browser as ブラウザ
    participant Worker as API Worker
    participant Twitter as Twitter OAuth API
    participant D1 as D1 Database
    
    User->>Browser: ログインボタンクリック
    Browser->>Worker: GET /api/auth/twitter
    Worker->>Worker: state生成（CSRF対策）
    Worker->>Worker: セッションにstate保存
    Worker-->>Browser: 302 Redirect
    Browser->>Twitter: OAuth認可リクエスト
    
    Twitter->>User: ログイン・認可画面表示
    User->>Twitter: 認可
    
    Twitter-->>Browser: 302 Redirect + code
    Browser->>Worker: GET /api/auth/callback?code=xxx&state=xxx
    
    Worker->>Worker: state検証
    Worker->>Twitter: トークン交換リクエスト
    Twitter-->>Worker: access_token
    
    Worker->>Twitter: ユーザー情報取得
    Twitter-->>Worker: ユーザー情報
    
    Worker->>D1: ユーザー作成/更新
    Worker->>D1: セッション作成
    D1-->>Worker: セッショントークン
    
    Worker-->>Browser: Set-Cookie: session=token<br/>302 Redirect to /
    Browser->>Browser: Cookieに認証情報保存
    
    Note over Browser,Worker: 以降のリクエストはCookieで認証
    
    Browser->>Worker: GET /api/users/me<br/>Cookie: session=token
    Worker->>D1: セッション検証
    D1-->>Worker: ユーザー情報
    Worker-->>Browser: ユーザー情報JSON
```

### セッション管理

- **セッショントークン**: ランダム生成された32文字の文字列
- **保存場所**: HttpOnly Secure Cookie
- **有効期限**: 30日間
- **セキュリティ**: CSRF対策（state パラメータ）、HttpOnly/Secure フラグ

---

## パフォーマンス最適化

### キャッシュ戦略

```mermaid
graph LR
    subgraph "Edge Network"
        CF[Cloudflare Cache]
    end
    
    subgraph "Application"
        Pages[Pages Functions]
        Worker[API Worker]
    end
    
    subgraph "Data Layer"
        D1[(D1 Database)]
        R2[R2 Storage]
    end
    
    User[ユーザー] -->|リクエスト| CF
    CF -->|キャッシュミス| Pages
    CF -->|キャッシュミス| Worker
    Pages --> D1
    Worker --> D1
    Worker --> R2
    
    CF -.->|キャッシュヒット<br/>静的アセット| User
    CF -.->|キャッシュヒット<br/>画像| User
    
    style CF fill:#c8e6c9
    style User fill:#e1f5ff
```

### パフォーマンス目標

- **90パーセンタイル**: 100ms以下
- **99パーセンタイル**: 500ms以下
- **静的アセット**: エッジキャッシュによる即座の配信
- **画像**: R2 + CDNによる高速配信

---

## セキュリティ

### セキュリティ対策

1. **認証・認可**
   - OAuth 2.0によるセキュアな認証
   - セッショントークンによる状態管理
   - HttpOnly/Secure Cookieの使用

2. **データ保護**
   - HTTPS通信の強制
   - SQLインジェクション対策（パラメータ化クエリ）
   - XSS対策（適切なエスケープ）

3. **アクセス制御**
   - ログの公開/非公開制御
   - ユーザー所有権の検証
   - APIエンドポイントの認証チェック

---

## 開発ワークフロー

### ローカル開発環境

```bash
# 依存関係のインストール
npm install --prefix backend
npm install --prefix frontend

# データベースのセットアップ
cd backend
npm run db:migrate
npm run db:seed

# 開発サーバーの起動
# ターミナル1: バックエンド
cd backend && npm run dev

# ターミナル2: フロントエンド
cd frontend && npm run dev
```

### テスト戦略

1. **コントラクトテスト**: OpenAPI仕様に対するAPI検証
2. **統合テスト**: サービス間の連携テスト
3. **ユニットテスト**: 個別コンポーネント・関数のテスト
4. **スモークテスト**: 基本的な動作確認

---

## まとめ

Shumilogは、Cloudflareのエッジプラットフォームを最大限活用した、モダンでスケーラブルなWebアプリケーションです。

### 主な特徴

- ✅ **フルスタックTypeScript**: フロントエンドからバックエンドまで一貫した開発体験
- ✅ **エッジファースト**: グローバルに高速なレスポンス
- ✅ **軽量SSR**: 必要最小限のサーバーサイドレンダリング
- ✅ **API駆動**: 明確な責務分離とスケーラブルな設計
- ✅ **型安全**: OpenAPI仕様からの自動型生成
- ✅ **開発者体験**: ホットリロード、自動デプロイ、包括的なテスト

### 参考ドキュメント

- [README.md](../README.md) - プロジェクト概要とセットアップ
- [API仕様書](../api/v1/openapi.yaml) - 正規API仕様
- [フロントエンドREADME](../frontend/README.md) - フロントエンド詳細
- [バックエンドREADME](../backend/README.md) - バックエンド詳細
