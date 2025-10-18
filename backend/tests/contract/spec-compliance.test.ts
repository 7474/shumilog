import { describe, it, expect } from 'vitest';
import { getAllSpecEndpoints, isEndpointInSpec } from '../helpers/spec-compliance';

/**
 * OpenAPI仕様完全性テスト
 * 
 * このテストスイートは以下を検証します：
 * 1. 実装されたエンドポイントがすべてOpenAPI仕様に存在すること
 * 2. OpenAPI仕様のエンドポイントが実装されていること
 * 
 * エンタープライズ品質の API 開発では、仕様と実装の双方向の整合性が必須です。
 */
describe('OpenAPI Specification Compliance', () => {
  
  /**
   * 実装されたエンドポイントリスト
   * 新しいエンドポイントを追加した際は、ここに追加して仕様との整合性をチェック
   */
  const implementedEndpoints = [
    { path: '/auth/twitter', method: 'GET' },
    { path: '/auth/callback', method: 'GET' },
    { path: '/auth/logout', method: 'POST' },
    { path: '/users/me', method: 'GET' },
    { path: '/users/me/logs', method: 'GET' },
    { path: '/users/me/stats', method: 'GET' },
    { path: '/tags', method: 'GET' },
    { path: '/tags', method: 'POST' },
    { path: '/tags/{tagId}', method: 'GET' },
    { path: '/tags/{tagId}', method: 'PUT' },
    { path: '/tags/{tagId}', method: 'DELETE' },
    { path: '/tags/{tagId}/associations', method: 'GET' },
    { path: '/tags/{tagId}/associations', method: 'POST' },
    { path: '/tags/{tagId}/associations', method: 'DELETE' },
    { path: '/support/tags', method: 'POST' },
    { path: '/logs', method: 'GET' },
    { path: '/logs', method: 'POST' },
    { path: '/logs/{logId}', method: 'GET' },
    { path: '/logs/{logId}', method: 'PUT' },
    { path: '/logs/{logId}', method: 'DELETE' },
    { path: '/logs/{logId}/related', method: 'GET' },
    { path: '/logs/{logId}/images', method: 'GET' },
    { path: '/logs/{logId}/images', method: 'POST' },
    { path: '/logs/{logId}/images/{imageId}', method: 'GET' },
    { path: '/logs/{logId}/images/{imageId}', method: 'DELETE' },
  ];

  it('all implemented endpoints exist in OpenAPI specification', () => {
    const missingFromSpec: Array<{ path: string; method: string }> = [];
    
    for (const endpoint of implementedEndpoints) {
      if (!isEndpointInSpec(endpoint.path, endpoint.method)) {
        missingFromSpec.push(endpoint);
      }
    }
    
    if (missingFromSpec.length > 0) {
      const missingList = missingFromSpec
        .map(ep => `  ${ep.method} ${ep.path}`)
        .join('\n');
        
      throw new Error(
        `以下のエンドポイントが実装されていますが、OpenAPI仕様に存在しません：\n${missingList}\n\n` +
        `解決策：\n` +
        `1. OpenAPI仕様 (/api/v1/openapi.yaml) にエンドポイントを追加する\n` +
        `2. 不要な実装の場合、バックエンドから削除する\n\n` +
        `エンタープライズ品質の維持のため、仕様と実装は常に同期してください。`
      );
    }
  });

  it('all OpenAPI specification endpoints are implemented', () => {
    const specEndpoints = getAllSpecEndpoints();
    const implementedPaths = new Set(
      implementedEndpoints.map(ep => `${ep.method.toUpperCase()}:${ep.path}`)
    );
    
    const missingImplementations: Array<{ path: string; method: string }> = [];
    
    for (const endpoint of specEndpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      if (!implementedPaths.has(key)) {
        missingImplementations.push(endpoint);
      }
    }
    
    if (missingImplementations.length > 0) {
      const missingList = missingImplementations
        .map(ep => `  ${ep.method} ${ep.path}`)
        .join('\n');
        
      throw new Error(
        `以下のエンドポイントがOpenAPI仕様に定義されていますが、実装されていません：\n${missingList}\n\n` +
        `解決策：\n` +
        `1. バックエンドにエンドポイントを実装する\n` +
        `2. 不要な仕様の場合、OpenAPI仕様から削除する\n\n` +
        `エンタープライズ品質の維持のため、仕様と実装は常に同期してください。`
      );
    }
  });

  it('validates specification loading and parsing', () => {
    // 仕様ファイルが正しく読み込めることを確認
    const endpoints = getAllSpecEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);
    
    // 既知のエンドポイントが存在することを確認
    const authEndpoint = endpoints.find(ep => 
      ep.path === '/auth/twitter' && ep.method === 'GET'
    );
    expect(authEndpoint).toBeDefined();
  });
});