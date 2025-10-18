import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OpenAPISpec {
  paths: Record<string, Record<string, unknown>>;
}

/**
 * OpenAPI仕様をロードする
 */
function loadOpenAPISpec(): OpenAPISpec {
  const openapiPath = path.resolve(__dirname, '../../../api/v1/openapi.yaml');
  const specContent = fs.readFileSync(openapiPath, 'utf8');
  return yaml.load(specContent) as OpenAPISpec;
}

/**
 * 指定されたパスとメソッドがOpenAPI仕様に存在するかをチェック
 * @param requestPath APIリクエストパス（/api プレフィックスあり・なし両方対応）
 * @param method HTTPメソッド
 * @returns 仕様に存在する場合true、存在しない場合false
 */
export function isEndpointInSpec(requestPath: string, method: string): boolean {
  const spec = loadOpenAPISpec();
  
  // /api プレフィックスを除去
  const pathWithoutApi = requestPath.startsWith('/api') 
    ? requestPath.substring(4) 
    : requestPath;
  
  // パラメータ部分を仕様のパターンに変換
  // 例: /logs/log_123/share -> /logs/{logId}/share
  const normalizedPath = normalizePathForSpec(pathWithoutApi);
  
  // 仕様内のパスを検索
  for (const specPath in spec.paths) {
    if (pathMatches(normalizedPath, specPath)) {
      const pathSpec = spec.paths[specPath];
      if (pathSpec && typeof pathSpec === 'object' && method.toLowerCase() in pathSpec) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * パスを仕様パターンに正規化
 * 実際のIDを{param}形式に変換
 */
function normalizePathForSpec(path: string): string {
  return path
    .replace(/\/log_[^/]+/g, '/{logId}')        // /log_xxx -> /{logId}
    .replace(/\/user_[^/]+/g, '/{userId}')      // /user_xxx -> /{userId}
    .replace(/\/tag_[^/]+/g, '/{tagId}')        // /tag_xxx -> /{tagId}
    .replace(/\/image_[^/]+/g, '/{imageId}')    // /image_xxx -> /{imageId}
    .replace(/\/[a-f0-9-]{8,}/g, '/{id}');       // UUID like strings -> /{id}
}

/**
 * パスが仕様パターンにマッチするかチェック
 */
function pathMatches(requestPath: string, specPath: string): boolean {
  // 完全一致
  if (requestPath === specPath) {
    return true;
  }
  
  // パラメータパターンマッチ
  const requestParts = requestPath.split('/');
  const specParts = specPath.split('/');
  
  if (requestParts.length !== specParts.length) {
    return false;
  }
  
  for (let i = 0; i < requestParts.length; i++) {
    const requestPart = requestParts[i];
    const specPart = specParts[i];
    
    // パラメータ部分（{xxx}）は任意の値とマッチ
    if (specPart.startsWith('{') && specPart.endsWith('}')) {
      continue;
    }
    
    // 固定部分は完全一致が必要
    if (requestPart !== specPart) {
      return false;
    }
  }
  
  return true;
}

/**
 * OpenAPI仕様に存在しないエンドポイントをテストした場合にエラーを投げる
 * @param requestPath APIリクエストパス
 * @param method HTTPメソッド
 * @throws Error 仕様に存在しないエンドポイントの場合
 */
export function requireEndpointInSpec(requestPath: string, method: string): void {
  if (!isEndpointInSpec(requestPath, method)) {
    const spec = loadOpenAPISpec();
    const availablePaths = Object.keys(spec.paths);
    
    throw new Error(
      `エンドポイント ${method.toUpperCase()} ${requestPath} がOpenAPI仕様に存在しません。\n` +
      `利用可能なパス: ${availablePaths.join(', ')}\n` +
      `このエンドポイントをテストする場合は、まずOpenAPI仕様に追加してください。`
    );
  }
}

/**
 * OpenAPI仕様に存在するすべてのエンドポイントを取得
 */
export function getAllSpecEndpoints(): Array<{ path: string; method: string }> {
  const spec = loadOpenAPISpec();
  const endpoints: Array<{ path: string; method: string }> = [];
  
  for (const path in spec.paths) {
    const pathSpec = spec.paths[path];
    if (pathSpec && typeof pathSpec === 'object') {
      for (const method in pathSpec) {
        endpoints.push({ path, method: method.toUpperCase() });
      }
    }
  }
  
  return endpoints;
}