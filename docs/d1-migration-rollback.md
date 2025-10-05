# D1マイグレーション ロールバック機能

## 概要

継続的デリバリ時のD1マイグレーション失敗に対するロールバック機能を実装しています。
マイグレーション実行前にD1のブックマークIDを取得し、マイグレーション失敗時に自動的にそのブックマークにロールバックします。

## 仕組み

### 1. マイグレーション前のブックマーク取得

```yaml
- name: Get D1 bookmark before migration
  id: bookmark-dev
  uses: cloudflare/wrangler-action@v3
  with:
    command: d1 time-travel info shumilog-db-devel --env development --json
```

D1の`time-travel info`コマンドを使用して、現在のデータベース状態のブックマークIDを取得します。

### 2. ブックマークIDの抽出

```yaml
- name: Extract bookmark ID
  id: extract-bookmark-dev
  run: |
    BOOKMARK=$(echo '${{ steps.bookmark-dev.outputs.command-output }}' \
      | jq -r '.result.bookmark // empty')
    echo "bookmark=$BOOKMARK" >> $GITHUB_OUTPUT
```

`jq`コマンドを使用してJSON出力からブックマークIDを抽出し、GitHub Actionsの出力として保存します。

### 3. マイグレーション実行

```yaml
- name: Run D1 Migrations
  id: migrate-dev
  uses: cloudflare/wrangler-action@v3
  with:
    command: d1 migrations apply shumilog-db-devel --env development --remote
```

通常通りマイグレーションを実行します。ステップIDを指定することで、失敗時の検知が可能になります。

### 4. 失敗時の自動ロールバック

```yaml
- name: Rollback D1 migration on failure
  if: >-
    failure() && steps.migrate-dev.outcome == 'failure' &&
    steps.extract-bookmark-dev.outputs.bookmark != ''
  uses: cloudflare/wrangler-action@v3
  with:
    command: >-
      d1 time-travel restore shumilog-db-devel
      --env development
      --bookmark ${{ steps.extract-bookmark-dev.outputs.bookmark }}
```

マイグレーションステップが失敗した場合のみ実行される条件付きステップです。
取得したブックマークIDを使用して、D1の`time-travel restore`コマンドでデータベースを以前の状態に戻します。

## 対応環境

この機能は以下の環境に対して実装されています:

- **Development環境** (`shumilog-db-devel`)
- **Production環境** (`shumilog-db`)

各環境で独立してブックマークの取得とロールバックが行われます。

## ワークフローの実行順序

1. 依存関係のインストール (`npm ci`)
2. **Development環境のマイグレーション**
   1. ブックマーク取得
   2. マイグレーション実行
   3. (失敗時) ロールバック
3. **Production環境のマイグレーション**
   1. ブックマーク取得
   2. マイグレーション実行
   3. (失敗時) ロールバック

## 注意事項

### ブックマークの有効性

- ブックマークIDが取得できなかった場合（空の場合）、ロールバックは実行されません
- D1のTime Travel機能には保持期間の制限があるため、古いブックマークは使用できない可能性があります

### マイグレーション順序

Development環境のマイグレーション失敗時、Production環境のマイグレーションは実行されません。
これにより、Development環境で問題を検知してからProduction環境に影響を与えることを防ぎます。

### 手動でのロールバック

必要に応じて、手動でロールバックを実行することも可能です:

```bash
# ブックマークIDの確認
wrangler d1 time-travel info shumilog-db-devel --env development --json

# 特定のブックマークにロールバック
wrangler d1 time-travel restore shumilog-db-devel \
  --env development \
  --bookmark <bookmark-id>
```

## 関連ファイル

- `.github/workflows/deploy.yml` - デプロイワークフロー（ロールバック機能を含む）
- `backend/migrations/` - マイグレーションファイル
- `backend/wrangler.toml` - Wrangler設定（D1データベース設定を含む）

## トラブルシューティング

### ブックマーク取得エラー

ブックマークの取得に失敗した場合、GitHub ActionsのログでJSON出力を確認してください。
D1 APIの応答形式が変更された可能性があります。

### ロールバック実行の確認

ロールバックが実行されたかどうかは、GitHub Actionsのログで以下を確認:
- "Rollback D1 migration on failure" ステップが実行されたか
- wranglerコマンドの出力でrestoreが成功したか

### ロールバック後の再実行

ロールバックが実行された場合、データベースはマイグレーション適用前の状態に完全に戻ります。
マイグレーションの問題を修正した後、再度マイグレーションを実行する必要があります。
ロールバックによってデータベースは一貫性のある状態に保たれるため、安全に再実行できます。
