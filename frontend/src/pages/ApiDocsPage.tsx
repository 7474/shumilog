import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * API仕様ドキュメントページ
 * OpenAPI仕様を表示するページコンポーネント
 */
export function ApiDocsPage() {
  return (
    <div className="w-full h-screen flex flex-col">
      {/* サイトに戻るナビゲーションバー */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-sky-600 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Shumilogに戻る</span>
        </Link>
      </div>
      
      {/* API Reference */}
      <div className="flex-1">
        <ApiReferenceReact
          configuration={{
            url: '/openapi.yaml',
            theme: 'default',
            showSidebar: true,
            darkMode: false,
          }}
        />
      </div>
    </div>
  );
}
