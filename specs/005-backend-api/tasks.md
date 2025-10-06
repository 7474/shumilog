# タスク: バックエンドAPI応答キャッシュ

**入力**: `/specs/005-backend-api/`からの設計ドキュメント
**前提条件**: plan.md（必須）、research.md、data-model.md、contracts/

## 実行フロー (main)
```
1. plan.md, research.md, data-model.md, contracts/ を読み込み
2. セットアップ・テスト・コア・統合・仕上げカテゴリでタスクを生成
3. ファイルごとに[P]マークで並列化
4. TDD順序でテスト→実装
5. 依存関係順に番号付与
6. 並列実行例を記載
7. 完全性チェック
```

## タスク一覧

### セットアップ
- T001 [P] Cloudflare Workers開発環境セットアップ（wrangler, hono, eslint, prettier, vitest） `/backend/`
- T002 [P] CDNキャッシュ検証用のCloudflare Analytics設定 `/backend/`

### テスト（TDD）
- T003 [P] コントラクトテスト作成 `/specs/005-backend-api/contracts/cache-get-noauth.test.ts`

### コア
- T004 GETかつ認証不要APIのキャッシュ制御ロジック実装 `/backend/src/middleware/security.ts`
- T005 CDNキャッシュ用応答ヘッダ（Cache-Control, SWR）付与 `/backend/src/middleware/security.ts`

### 統合
- T006 [P] quickstart.md記載の手順でCDNキャッシュ動作確認 `/specs/005-backend-api/quickstart.md`

### 仕上げ
- T007 [P] ドキュメント整備 `/specs/005-backend-api/README.md`
- T008 [P] パフォーマンス検証（キャッシュヒット時p95 < 100ms） `/backend/tests/integration/cache-perf.test.ts`

## 並列実行例
- T001, T002, T003, T006, T007, T008は並列実行可能
- T004→T005は順次実行

## 依存関係
- T003→T004, T005
- T004→T005
- T001, T002, T003, T006, T007, T008は独立

## 完全性チェック
- すべてのコントラクトにテストあり
- すべてのエンティティにモデル定義あり
- すべてのエンドポイントに実装タスクあり
