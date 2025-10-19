# API

このディレクトリには、shumilogプロジェクトのAPI仕様が含まれています。

## 技術コンテキスト

- バックエンド: Cloudflare Workers + Hono で実装
- フロントエンド: React 19 + Tailwind CSS
- 契約テスト: Vitest でAPIスキーマ準拠を検証

## 構造

- `v1/` - バージョン1 API仕様
  - `openapi.yaml` - Hobby Content Log API の OpenAPI 仕様


## 保守

このAPI仕様は、すべてのAPI開発の信頼できる情報源であり、機能開発に伴って継続的に保守する必要があります。APIに変更を加える場合：

1. まず仕様を更新する
2. 仕様に合わせて契約テストを更新する
3. API変更を実装する
4. 実装が仕様に一致することを検証する

## 使用方法

- バックエンドの契約テストはこの仕様を参照する
- フロントエンドのAPIクライアントはこの仕様から生成する

## フィールド定義ポリシー

### 必須フィールドポリシー

OpenAPIスキーマ内のすべてのフィールドは、以下の厳格なルールに従います：

1. 原則必須（Required by Default）: すべてのフィールドは原則として`required`配列に含めます
2. Nullable条件の明示（Explicit Nullable Conditions）: やむを得ずnullableなフィールドとする場合は、`nullable: true`を指定し、descriptionにnullとなる条件を明示します
3. リストフィールドは必須（Arrays Always Required）: いかなる場合もリストフィールドは必須とします。要素がない場合は空のリスト`[]`を返します
