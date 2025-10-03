import { Link } from 'react-router-dom';
import { Log } from '@/models';

interface LogCardProps {
  log: Log;
}

export function LogCard({ log }: LogCardProps) {
  return (
    <Link
      to={`/logs/${log.id}`}
      className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-sky-300 hover:shadow-md transition-all"
    >
      <div className="space-y-2">
        {/* タイトル */}
        {log.title && (
          <h4 className="font-semibold text-gray-900 line-clamp-1">
            {log.title}
          </h4>
        )}
        
        {/* コンテンツプレビュー */}
        <p className="text-sm text-gray-600 line-clamp-2">
          {log.content_md.substring(0, 150)}
          {log.content_md.length > 150 ? '...' : ''}
        </p>
        
        {/* メタ情報 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            {log.author?.avatar_url && (
              <img
                src={log.author.avatar_url}
                alt={log.author.display_name}
                className="w-5 h-5 rounded-full"
              />
            )}
            <span>{log.author?.display_name || 'Unknown'}</span>
          </div>
          <time dateTime={log.created_at}>
            {new Date(log.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </time>
        </div>
        
        {/* タグ */}
        {log.tags && log.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {log.tags.slice(0, 3).map((logTag) => (
              <span
                key={logTag.id}
                className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                <span>{logTag.name}</span>
              </span>
            ))}
            {log.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{log.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
