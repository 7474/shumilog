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
      className="block p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-sky-300 hover:shadow-md transition-all"
    >
      <div className="space-y-2">
        {/* タイトル、コンテンツとサムネイルエリア */}
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
            {/* タイトル */}
            {log.title && <h4 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-1">{log.title}</h4>}
            
            {/* コンテンツプレビュー */}
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
              {getMarkdownSummary(log.content_md, 150)}
            </p>
          </div>

          {/* サムネイル画像（右上・控えめな表示、モバイルで小さく） */}
          {firstImage && (
            <div className="flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={getLogCardThumbnailUrl(`${baseUrl}/logs/${log.id}/images/${firstImage.id}`)}
                alt={log.title || 'ログ画像'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* タグ（モバイルで2個、デスクトップで3個まで表示） */}
        {log.associated_tags && log.associated_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {log.associated_tags.slice(0, 2).map((logTag) => (
              <span
                key={logTag.id}
                className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                <span className="truncate max-w-[120px]">{logTag.name}</span>
              </span>
            ))}
            {log.associated_tags.length > 2 && log.associated_tags[2] && (
              <span
                key={log.associated_tags[2].id}
                className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                <span className="truncate max-w-[120px]">{log.associated_tags[2].name}</span>
              </span>
            )}
            {log.associated_tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{log.associated_tags.length - 3}
              </span>
            )}
            {log.associated_tags.length === 3 && (
              <span className="sm:hidden text-xs text-gray-500">
                +1
              </span>
            )}
          </div>
        )}

        {/* メタ情報（下部に統一） */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            {log.user?.avatar_url && (
              <img
                src={log.user.avatar_url}
                alt={log.user.display_name}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex-shrink-0"
              />
            )}
            <span className="truncate">{log.user?.display_name || 'Unknown'}</span>
          </div>
          <time dateTime={log.created_at} className="flex-shrink-0 ml-2">
            <span className="hidden sm:inline">
              {new Date(log.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="sm:hidden">
              {new Date(log.created_at).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </time>
        </div>
      </div>
    </Link>
  );
}
