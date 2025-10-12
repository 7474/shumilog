# OGP画像最適化実装 - 視覚的説明

## 実装前 vs 実装後

### 実装前
```
ログのSSR時:
  ┌──────────────────┐
  │ OGPボットがアクセス │
  └─────────┬────────┘
            ↓
  ┌──────────────────┐
  │ ミドルウェアで     │
  │ ログデータ取得     │
  └─────────┬────────┘
            ↓
  ┌──────────────────┐
  │ OGPタグ生成       │
  │ - タイトル        │
  │ - 説明文          │
  │ ❌ 画像なし       │  ← 画像があっても使われていなかった
  └─────────┬────────┘
            ↓
  ┌──────────────────┐
  │ Twitter Card:     │
  │ summary (小)      │
  └──────────────────┘
```

### 実装後
```
ログのSSR時:
  ┌──────────────────┐
  │ OGPボットがアクセス │
  └─────────┬────────┘
            ↓
  ┌──────────────────┐
  │ ミドルウェアで     │
  │ ログデータ取得     │
  │ - タイトル        │
  │ - 説明文          │
  │ - 関連画像配列    │  ← 画像データを取得
  └─────────┬────────┘
            ↓
  ┌──────────────────────────────────────┐
  │ 先頭画像を処理（新機能）                │
  │                                        │
  │ 1. 画像IDを取得                         │
  │    images[0].id = "image_1"            │
  │                                        │
  │ 2. 画像URLを構築                        │
  │    /api/logs/{logId}/images/{imageId}  │
  │                                        │
  │ 3. Cloudflare Image Resizingで最適化    │
  │    getOgpImageUrl(imageUrl, baseUrl)   │
  │    ↓                                   │
  │    /cdn-cgi/image/                     │
  │      width=1200,height=630,            │
  │      fit=cover,quality=85,             │
  │      format=auto                       │
  │    /{元のURL}                           │
  └─────────┬────────────────────────────┘
            ↓
  ┌──────────────────┐
  │ OGPタグ生成       │
  │ - タイトル        │
  │ - 説明文          │
  │ ✅ 最適化画像URL │  ← 1200x630pxに最適化された画像
  └─────────┬────────┘
            ↓
  ┌──────────────────┐
  │ Twitter Card:     │
  │ summary_large_image│ ← 自動的に大きな画像カードに
  └──────────────────┘
```

## 画像URL変換の詳細

```
入力:
  log.images[0] = {
    id: "image_1",
    log_id: "log_alice_1",
    file_name: "screenshot.jpg",
    ...
  }

変換ステップ:
  1. 基本URLを構築
     https://shumilog.dev/api/logs/log_alice_1/images/image_1

  2. Cloudflare Image Resizingパラメータを追加
     オプション: width=1200,height=630,fit=cover,quality=85,format=auto

  3. 最終URL
     https://shumilog.dev/cdn-cgi/image/
       width=1200,height=630,fit=cover,quality=85,format=auto/
       https://shumilog.dev/api/logs/log_alice_1/images/image_1

出力:
  - TwitterやFacebookで大きな画像プレビュー表示
  - WebP/AVIF対応ブラウザでは自動的に最適フォーマット配信
  - CDNキャッシュによる高速配信
```

## ファイル変更の概要

```
frontend/
├── functions/
│   └── _middleware.ts          ← SSRミドルウェア更新
│       - getOgpImageUrl() 関数追加
│       - handleLogSSR() で画像URL構築と最適化
│
├── src/
│   └── utils/
│       └── imageOptimizer.ts   ← 画像最適化ユーティリティ更新
│           - getOgpImageUrl() 関数追加（サーバーサイド用）
│
└── tests/
    └── unit/
        ├── imageOptimizer.test.ts ← テスト追加
        │   - getOgpImageUrl() のテスト
        │
        └── middleware.test.ts      ← 新規作成
            - SSR画像URL生成ロジックのテスト

docs/
├── ssr-implementation-report.md   ← 更新
│   - OGP画像最適化機能の説明追加
│
└── ogp-image-optimization.md      ← 新規作成
    - 詳細な実装ガイド
    - Cloudflare Image Resizingの説明
```

## 期待される結果

### Twitterでシェアされた場合

**実装前:**
```
┌─────────────────────────┐
│ 進撃の巨人 最終話を見た      │
│ ────────────────────   │
│ 進撃の巨人 最終話の感想...  │
│                         │
│ shumilog.dev            │
└─────────────────────────┘
```

**実装後:**
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │     [画像プレビュー 1200x630]      │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 進撃の巨人 最終話を見た                │
│ 進撃の巨人 最終話の感想...            │
│ shumilog.dev                        │
└─────────────────────────────────────┘
```

### 技術的メリット

1. **パフォーマンス**
   - CDNエッジでのキャッシュ
   - 最適なフォーマット自動選択（WebP/AVIF）
   - 帯域幅の削減

2. **ユーザー体験**
   - 大きな画像プレビューで視認性向上
   - クリック率の向上が期待できる

3. **開発効率**
   - サーバーレスで自動最適化
   - 画像処理サーバー不要
   - Cloudflareのインフラを活用
