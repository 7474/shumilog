/**
 * API型定義
 *
 * このファイルはOpenAPI仕様から自動生成された型定義を再エクスポートします。
 * OpenAPI仕様が更新された場合は、以下のコマンドで型を再生成してください：
 *
 *   npm run generate:types
 *
 * @see ../api/v1/openapi.yaml - 正規のAPI仕様書
 */

import type { components } from './types/api';

// コンポーネントスキーマの型をエクスポート
export type User = components['schemas']['User'];
export type Tag = components['schemas']['Tag'];
export type TagCreate = components['schemas']['TagCreate'];
export type TagUpdate = components['schemas']['TagUpdate'];
export type TagDetail = components['schemas']['TagDetail'];
export type Log = components['schemas']['Log'];
export type LogCreate = components['schemas']['LogCreate'];
export type LogUpdate = components['schemas']['LogUpdate'];
export type LogDetail = components['schemas']['LogDetail'];
export type LogImage = components['schemas']['LogImage'];

// API レスポンス型のヘルパー
export type paths = components['schemas'];
