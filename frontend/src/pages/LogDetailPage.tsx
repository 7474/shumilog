import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, X, AlertTriangle, FileText, Lock, Loader2, MoreVertical } from 'lucide-react';
import { api } from '@/services/api';
import { Log } from '@/api-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LogForm } from '@/components/LogForm';
import { RelatedLogs } from '@/components/RelatedLogs';
import { LogImages } from '@/components/LogImages';
import { useAuth } from '@/hooks/useAuth';
import { ShareToXButton } from '@/components/ShareToXButton';
import { useOgp, extractPlainText } from '@/hooks/useOgp';

export function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
      if (!id) {
        setError('Log ID not provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await api.GET('/logs/{logId}', {
          params: { path: { logId: id } },
        });
        if (fetchError || !data) {
          throw new Error('Failed to fetch log');
        }
        setLog(data);
      } catch (err) {
        console.error('Failed to fetch log:', err);
        setError('Failed to load log');
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id]);

  const handleEditSuccess = (_logId?: string) => {
    setIsEditing(false);
    // Refetch log to get updated data
    const fetchLog = async () => {
      if (!id) return;
      try {
        const { data } = await api.GET('/logs/{logId}', {
          params: { path: { logId: id } },
        });
        if (data) {
          setLog(data);
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
      setIsDeleting(true);
      const { error } = await api.DELETE('/logs/{logId}', {
        params: { path: { logId: id } },
      });
      if (error) {
        throw new Error('Failed to delete log');
      }
      // Navigate back to logs page after successful deletion
      navigate('/logs');
    } catch (err) {
      console.error('Failed to delete log:', err);
      setError('Failed to delete log');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if current user is the log owner
  const isOwner = user && log && log.user.id === user.id;

  // OGPメタデータの設定（SSRと同じ内容）
  useOgp(log && log.is_public ? {
    title: log.title || 'ログ',
    description: extractPlainText(log.content_md || '', 200),
    url: window.location.href,
    image: log.images && log.images.length > 0
      ? `${window.location.origin}/api/logs/${log.id}/images/${log.images[0].id}`
      : undefined,
    type: 'article',
  } : {
    title: 'Shumilog',
    description: 'Your Personal Hobby Logger',
    url: window.location.href,
  });

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
        <AlertTriangle size={48} className="text-red-500" />
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
        <FileText size={64} className="text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">ログが見つかりません</h2>
        <p className="text-gray-600">指定されたログは存在しないか、削除された可能性があります。</p>
        <Link to="/logs">
          <Button className="btn-fresh">ログ一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー: 戻るボタンと操作ボタン */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/logs">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>ログ一覧に戻る</span>
          </Button>
        </Link>

        <div className="flex flex-wrap gap-2 ml-auto">
          {/* Xへの共有ボタン（公開ログのみ） */}
          {log.is_public && (
            <ShareToXButton
              text={log.title || ''}
              url={window.location.href}
              hashtags={log.associated_tags?.map(tag => tag.name) || []}
              size="sm"
              variant="outline"
              className="text-sky-600 border-sky-200 hover:bg-sky-50"
            />
          )}

          {/* 編集・削除操作（オーナーのみ、編集中は非表示）- ドロップダウンメニュー */}
          {isOwner && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsEditing(true)}
                  className="cursor-pointer"
                >
                  <Edit size={16} className="mr-2" />
                  <span>編集</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 size={16} className="mr-2" />
                  <span>削除</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 編集モード */}
      {isEditing && isOwner ? (
        <Card className="card-fresh space-y-4">
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
            <LogForm log={log} onSuccess={handleEditSuccess} onCancel={() => setIsEditing(false)} />
          </CardContent>
        </Card>
      ) : (
        /* 閲覧モード */
        <>
          {/* ログ詳細カード */}
          <Card className="card-fresh space-y-4">
            <CardHeader className="space-y-4">
              {/* タイトル */}
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
                {log.title}
              </CardTitle>

              {/* 作者情報 */}
              <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
                {log.user.avatar_url && (
                  <img
                    src={log.user.avatar_url}
                    alt={log.user.display_name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-fresh-200"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{log.user.display_name}</p>
                  <p className="text-sm text-gray-500">@{log.user.twitter_username}</p>
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
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">更新日:</span>
                  <time dateTime={log.updated_at}>
                    {new Date(log.updated_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                      log.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {!log.is_public && (
                      <>
                        <Lock size={12} />
                        非公開
                      </>
                    )}
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
              {log.associated_tags && log.associated_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 mt-6">
                  {log.associated_tags.map((tag) => (
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
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">ログを削除しますか？</DialogTitle>
            <DialogDescription className="text-gray-700">
              このログを削除すると、元に戻すことはできません。本当に削除してもよろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>削除中...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>削除する</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
