import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, X } from 'lucide-react';
import { api } from '@/services/api';
import { Log } from '@/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LogForm } from '@/components/LogForm';
import { RelatedLogs } from '@/components/RelatedLogs';
import { LogImages } from '@/components/LogImages';
import { useAuth } from '@/hooks/useAuth';
import { ShareToXButton } from '@/components/ShareToXButton';

export function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
      if (!id) {
        setError('Log ID not provided');
        setLoading(false);
        return;
      }

      try {
        const response = await api.logs[':logId'].$get({ param: { logId: id } });
        if (!response.ok) {
          throw new Error('Failed to fetch log');
        }
        const result = await response.json();
        setLog(result);
      } catch (err) {
        console.error('Failed to fetch log:', err);
        setError('Failed to load log');
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id]);

  const handleEditSuccess = () => {
    setIsEditing(false);
    // Refetch log to get updated data
    const fetchLog = async () => {
      if (!id) return;
      try {
        const response = await api.logs[':logId'].$get({ param: { logId: id } });
        if (response.ok) {
          const result = await response.json();
          setLog(result);
        }
      } catch (err) {
        console.error('Failed to refetch log:', err);
      }
    };
    fetchLog();
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const response = await api.logs[':id'].$delete({ param: { id } });
      if (!response.ok) {
        throw new Error('Failed to delete log');
      }
      // Navigate back to logs page after successful deletion
      navigate('/logs');
    } catch (err) {
      console.error('Failed to delete log:', err);
      setError('Failed to delete log');
      setShowDeleteConfirm(false);
    }
  };

  // Check if current user is the log owner
  const isOwner = user && log && log.author.id === user.id;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fresh-500"></div>
        <p className="text-gray-600">ログを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="text-gray-600">{error}</p>
        <Link to="/logs">
          <Button variant="outline">ログ一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <div className="text-6xl">📝</div>
        <h2 className="text-xl font-bold text-gray-900">ログが見つかりません</h2>
        <p className="text-gray-600">指定されたログは存在しないか、削除された可能性があります。</p>
        <Link to="/logs">
          <Button className="btn-fresh">ログ一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー: 戻るボタンと編集/削除ボタン */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <Link to="/logs">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>ログ一覧に戻る</span>
          </Button>
        </Link>
        
        <div className="flex flex-wrap gap-2">
          {/* 公開ログの場合はXへの共有ボタンを表示 */}
          {log.is_public && (
            <ShareToXButton
              text={log.title}
              url={window.location.href}
              hashtags={log.tags?.map(tag => tag.name) || []}
              size="sm"
              variant="outline"
              className="text-sky-600 border-sky-200 hover:bg-sky-50"
            />
          )}
          
          {isOwner && !isEditing && (
            <>
              <Button 
                onClick={() => setIsEditing(true)}
                className="btn-fresh flex items-center gap-2"
                size="sm"
              >
                <Edit size={16} />
                <span>編集</span>
              </Button>
              <Button 
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="flex items-center gap-2"
                size="sm"
              >
                <Trash2 size={16} />
                <span>削除</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 編集モード */}
      {isEditing && isOwner ? (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit size={20} />
                <span>ログを編集</span>
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1"
              >
                <X size={16} />
                <span className="text-sm">キャンセル</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogForm
              log={log}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        /* 閲覧モード */
        <>
          {/* ログ詳細カード */}
          <Card className="card-fresh">
            <CardHeader className="space-y-4">
              {/* タイトル */}
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
                {log.title || 'タイトルなし'}
              </CardTitle>

              {/* 作者情報 */}
              <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
                {log.author.avatar_url && (
                  <img
                    src={log.author.avatar_url}
                    alt={log.author.display_name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-fresh-200"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{log.author.display_name}</p>
                  <p className="text-sm text-gray-500">@{log.author.twitter_username}</p>
                </div>
              </div>

              {/* メタ情報 */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">作成日:</span>
                  <time dateTime={log.created_at}>
                    {new Date(log.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">更新日:</span>
                  <time dateTime={log.updated_at}>
                    {new Date(log.updated_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.is_public 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {log.is_public ? '🌐 公開' : '🔒 非公開'}
                  </span>
                </div>
              </div>
            </CardHeader>

            {/* コンテンツ */}
            <CardContent>
              <div className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-sky-600 hover:prose-a:text-sky-700 prose-strong:text-gray-900 prose-code:text-pink-600 prose-pre:bg-gray-50">
                <MarkdownRenderer content={log.content_md} />
              </div>

              {/* 画像 */}
              {log.images && log.images.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-6">
                  <LogImages logId={log.id} images={log.images} />
                </div>
              )}

              {/* タグ */}
              {log.tags && log.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 mt-6">
                  {log.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      to={`/tags/${encodeURIComponent(tag.name)}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-50 to-fresh-50 hover:from-sky-100 hover:to-fresh-100 text-sky-700 rounded-full text-sm font-medium transition-all border border-sky-200 hover:border-sky-300"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      <span>#{tag.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 関連するログ */}
          {log && <RelatedLogs logId={log.id} />}
        </>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-red-600">
                ログを削除しますか？
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                このログを削除すると、元に戻すことはできません。本当に削除してもよろしいですか？
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  キャンセル
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  <span>削除する</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}