import { Link } from 'react-router-dom';
import { Log } from '@/api-types';
import { getMarkdownSummary } from '@/utils/markdownUtils';
import { getLogCardThumbnailUrl } from '@/utils/imageOptimizer';

interface LogCardProps {
  log: Log;
}

export function LogCard({ log }: LogCardProps) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const firstImage = log.images && log.images.length > 0 ? log.images[0] : null;

  return (
    <Link
      to={`/logs/${log.id}`}
      className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-sky-300 hover:shadow-md transition-all"
    >
      <div className="flex gap-3">
        {/* メインコンテンツエリア（左側） */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* タイトル */}
          {log.title && <h4 className="font-semibold text-gray-900 line-clamp-1">{log.title}</h4>}

          {/* コンテンツプレビュー */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {getMarkdownSummary(log.content_md, 150)}
          </p>

          {/* メタ情報 */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <div className="flex items-center space-x-2">
              {log.user?.avatar_url && (
                <img
                  src={log.user.avatar_url}
                  alt={log.user.display_name}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span>{log.user?.display_name || 'Unknown'}</span>
            </div>
            <time dateTime={log.created_at}>
              {new Date(log.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </div>

          {/* タグ */}
          {log.associated_tags && log.associated_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {log.associated_tags.slice(0, 3).map((logTag) => (
                <span
                  key={logTag.id}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  <span>{logTag.name}</span>
                </span>
              ))}
              {log.associated_tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{log.associated_tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* サムネイル画像（右側・控えめな表示） */}
        {firstImage && (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={getLogCardThumbnailUrl(`${baseUrl}/logs/${log.id}/images/${firstImage.id}`)}
              alt={log.title || 'ログ画像'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
