import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { Tag, Log } from '@/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LogForm } from '@/components/LogForm';
import { LogCard } from '@/components/LogCard';
import { useAuth } from '@/hooks/useAuth';

interface TagDetail extends Tag {
  associations: Tag[];
  usage_count: number;
  recent_logs: Log[];
  recent_referring_tags: Tag[];
}

export function TagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tag, setTag] = useState<TagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchTag = async () => {
      if (!id) {
        setError('Tag ID not provided');
        setLoading(false);
        return;
      }

      try {
        const response = await api.tags[':id'].$get({ param: { id } });
        if (!response.ok) {
          throw new Error('Failed to fetch tag');
        }
        const data = await response.json();
        setTag(data as TagDetail);
      } catch (err) {
        console.error('Failed to fetch tag:', err);
        setError('Failed to load tag');
      } finally {
        setLoading(false);
      }
    };

    fetchTag();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    
    if (window.confirm('このタグを削除してもよろしいですか？')) {
      try {
        const response = await api.tags[':id'].$delete({ param: { id } });
        if (!response.ok) {
          throw new Error('Failed to delete tag');
        }
        navigate('/tags');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'タグの削除に失敗しました');
      }
    }
  };

  const handleLogSuccess = () => {
    setShowLogForm(false);
    navigate('/logs');
  };

  const formatTagHashtag = (tagName: string): string => {
    // タグ名に空白が含まれる場合は #{tagName} 形式、そうでなければ #tagName 形式
    return tagName.includes(' ') ? `#{${tagName}}` : `#${tagName}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        <p className="text-gray-600">タグを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <div className="text-4xl">❌</div>
        <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="text-gray-600">{error}</p>
        <Link to="/tags">
          <Button variant="outline">
            タグ一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <div className="text-4xl">🏷️</div>
        <h2 className="text-xl font-bold text-gray-900">タグが見つかりません</h2>
        <Link to="/tags">
          <Button variant="outline">
            タグ一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Link to="/tags">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              一覧に戻る
            </Button>
          </Link>
        </div>
        {isAuthenticated && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowLogForm(!showLogForm)}
              size="sm"
              className={showLogForm ? "bg-gray-500 hover:bg-gray-600" : "btn-fresh"}
            >
              {showLogForm ? '✕ キャンセル' : '✨ このタグでログを作成'}
            </Button>
            <Link to={`/tags`}>
              <Button
                size="sm"
                variant="outline"
                className="text-sky-600 border-sky-200 hover:bg-sky-50"
              >
                ✏️ 編集
              </Button>
            </Link>
            <Button
              onClick={handleDelete}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              🗑️ 削除
            </Button>
          </div>
        )}
      </div>

      {/* ログ作成フォーム */}
      {showLogForm && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>✨</span>
              <span>{tag.name} のログを作成</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogForm
              initialContent={formatTagHashtag(tag.name)}
              onSuccess={handleLogSuccess}
              onCancel={() => setShowLogForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* タグ詳細カード */}
      <Card className="card-fresh">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <span className="w-6 h-6 rounded-full bg-gradient-to-r from-sky-400 to-fresh-400"></span>
            <span>{tag.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 説明 */}
          {tag.description ? (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 説明</h3>
              <MarkdownRenderer content={tag.description} tags={tag.associations} />
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-6">
              <p className="text-gray-500 italic">説明はありません</p>
            </div>
          )}

          {/* メタデータ */}
          <div className="border-t border-gray-100 pt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">ℹ️ 情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 font-medium min-w-[100px]">📊 使用回数:</span>
                <span className="text-gray-900">{tag.usage_count} 回</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 font-medium min-w-[100px]">📅 作成日:</span>
                <span className="text-gray-900">
                  {new Date(tag.created_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 font-medium min-w-[100px]">🔄 更新日:</span>
                <span className="text-gray-900">
                  {new Date(tag.updated_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* 関連タグ */}
          {tag.associations && tag.associations.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🔗 関連タグ</h3>
              <div className="flex flex-wrap gap-2">
                {tag.associations.map((associatedTag) => (
                  <Link key={associatedTag.id} to={`/tags/${associatedTag.id}`}>
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-sm hover:bg-sky-100 transition-colors cursor-pointer">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      <span>{associatedTag.name}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 新着の被参照関連タグ */}
          {tag.recent_referring_tags && tag.recent_referring_tags.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🔖 新着の被参照関連タグ</h3>
              <div className="flex flex-wrap gap-2">
                {tag.recent_referring_tags.map((referringTag) => (
                  <Link key={referringTag.id} to={`/tags/${referringTag.id}`}>
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100 transition-colors cursor-pointer">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      <span>{referringTag.name}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新着ログ */}
      {tag.recent_logs && tag.recent_logs.length > 0 && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <span>📝</span>
              <span>新着のログ</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tag.recent_logs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
