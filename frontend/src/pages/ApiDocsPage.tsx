import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

/**
 * API仕様ドキュメントページ
 * OpenAPI仕様を表示するページコンポーネント
 */
export function ApiDocsPage() {
  return (
    <div className="w-full h-screen">
      <ApiReferenceReact
        configuration={{
          url: '/openapi.yaml',
          theme: 'default',
          showSidebar: true,
          darkMode: false,
        }}
      />
    </div>
  );
}
