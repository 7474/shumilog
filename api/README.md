# API Specifications

This directory contains the canonical API specifications for the shumilog project.

## 技術コンテキスト

- **バックエンド**: Cloudflare Workers + Hono で実装
- **データベース**: Cloudflare D1 (SQLite)
- **フロントエンド**: React 19 + Tailwind CSS
- **契約テスト**: Vitest でAPIスキーマ準拠を検証

## Structure

- `v1/` - Version 1 API specifications
  - `openapi.yaml` - OpenAPI 3.0 specification for the Hobby Content Log API

## Field Definition Policy

### Required Fields Policy

All fields in OpenAPI schemas follow these strict rules:

1. **原則必須（Required by Default）**: すべてのフィールドは原則として`required`配列に含めます
2. **Nullable条件の明示（Explicit Nullable Conditions）**: やむを得ずnullableなフィールドとする場合は、`nullable: true`を指定し、descriptionにnullとなる条件を明示します
3. **リストフィールドは必須（Arrays Always Required）**: いかなる場合もリストフィールドは必須とします。要素がない場合は空のリスト`[]`を返します

### Examples

**Good Example - All fields required:**
```yaml
User:
  type: object
  required:
    - id
    - twitter_username
    - display_name
    - avatar_url
    - role
    - created_at
  properties:
    id:
      type: string
    twitter_username:
      type: string
    # ... other fields
```

**Good Example - Nullable field with explicit condition:**
```yaml
Tag:
  type: object
  required:
    - id
    - name
    - description
    - metadata
    - created_by
    - created_at
    - updated_at
  properties:
    description:
      type: string
      nullable: true
      description: Optional description for the tag. null when not provided by user.
    # ... other fields
```

**Good Example - Array field always required:**
```yaml
type: object
required:
  - items
  - total
properties:
  items:
    type: array
    items:
      $ref: '#/components/schemas/Log'
  total:
    type: integer
```

## Maintenance

This API specification is the **source of truth** for all API development and should be continuously maintained as features are developed. When making changes to the API:

1. Update the specification first
2. Update contract tests to match the specification
3. Implement the API changes
4. Verify that implementation matches the specification

## Usage

- Backend contract tests reference this specification
- Frontend API clients should be generated from this specification
- Documentation is generated from this specification