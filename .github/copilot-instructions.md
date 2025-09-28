# shumilog Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-08

## 必須開発指針

**重要**: 以下の指針は必須であり、競合する内容はこの指針に従って廃止されます。

1. **日本語での応答**: 全ての応答・説明・コメントは日本語で行う
2. **npmパッケージ管理**: パッケージの追加・変更・削除は必ずnpmコマンドで行う。パッケージ操作目的でpackage.jsonを直接編集することは禁止
3. **ランタイム・ライブラリ版本選択**: LTS版を最優先とし、LTSが存在しない場合のみ最新版を使用する

## Active Technologies
- Node.js 22 LTS + npm 10+ (ランタイム)
- TypeScript 5.9+ (コンパイラ・開発言語)
- Cloudflare Workers + Hono (バックエンドフレームワーク)
- Cloudflare D1 (SQLiteベースデータベース)
- Vite + React 19 (フロントエンド)
- Vitest (テストフレームワーク)
- Wrangler CLI (Cloudflare開発ツール)
- ESLint + Prettier (コード品質)

## プロジェクト構造
```
api/                    # 正規API仕様書（信頼できる情報源）
backend/                # Cloudflare Workers バックエンド
frontend/               # React + Vite フロントエンド
tests/                  # テストファイル
```

## API開発ガイドライン
- 正規のAPI仕様書は `/api/v1/openapi.yaml` にあり、これを最新に保つ必要があります
- 変更実装前に必ずAPI仕様書を更新する
- コントラクトテストは正規仕様を参照する
- 仕様書はすべてのAPI開発の信頼できる情報源です

## パッケージ管理とコマンド

### npmパッケージ管理（必須遵守）
- パッケージ追加: `npm install <package-name>`
- パッケージ削除: `npm uninstall <package-name>`
- devDependencies追加: `npm install --save-dev <package-name>`
- **package.jsonの直接編集は禁止** - 必ずnpmコマンドを使用

### 開発コマンド
- `npm test` - テスト実行
- `npm run lint` - リント実行
- `npm run dev` - 開発サーバー起動
- `npm run build` - ビルド実行

## コードスタイル
- TypeScript: 標準的な規約に従う
- ESLint設定に準拠
- Prettierによる自動フォーマット
- 日本語コメント推奨

## 最新の変更
- 2025-01-08: Copilotインストラクション見直し - 日本語応答・npmパッケージ管理・LTS優先の必須指針追加
- Node.js 22 LTS + npm 10+への統一（.nvmrc: 22.20.0）
- TypeScript 5.9+、React 19、Vite 7+への更新

<!-- MANUAL ADDITIONS START -->
## API仕様の管理

正規のAPI仕様書は `/api/v1/openapi.yaml` にあり、すべてのAPI開発の**信頼できる情報源**として機能します。この仕様書は実装と常に同期して保守する必要があります。

### API変更時の手順:
1. `/api/v1/openapi.yaml` を最初に更新
2. 仕様に合わせてコントラクトテストを更新
3. バックエンドでAPI変更を実装
4. `npm run test:contract` で仕様と実装の適合性を検証

### 重要なポイント:
- 正規仕様は常に `/api/v1/openapi.yaml` を参照
- `specs/001-web-x-twitter/contracts/api.yaml` の旧ロケーションは非推奨
- コントラクトテストは正規仕様に対して検証を行う
- APIエンドポイント、スキーマ、動作が変更された際は仕様を更新
<!-- MANUAL ADDITIONS END -->
