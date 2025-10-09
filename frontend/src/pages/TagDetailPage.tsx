import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PenLine, X, Trash2, FileText, Tag as TagIcon, Loader2, Edit } from 'lucide-react';
import { api } from '@/services/api';
import { Tag, Log } from '@/api-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LogForm } from '@/components/LogForm';
import { LogCard } from '@/components/LogCard';
import { TagForm } from '@/components/TagForm';
import { useAuth } from '@/hooks/useAuth';
import { ShareToXButton } from '@/components/ShareToXButton';

interface TagDetail extends Tag {
  associations: Tag[];
  usage_count: number;
  recent_logs: Log[];
  recent_referring_tags: Tag[];
}

export function TagDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [tag, setTag] = useState<TagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchTag = async () => {
      if (!name) {
        setError('Tag name not provided');
        setLoading(false);
        return;
      }

      try {
        // Decode the URL-encoded tag name
        const decodedName = decodeURIComponent(name);
        const response = await api.tags[':id'].$get({ param: { id: decodedName } });
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
  }, [name]);

  const fetchTag = async () => {
    if (!name) return;

    try {
      const decodedName = decodeURIComponent(name);
      const response = await api.tags[':id'].$get({ param: { id: decodedName } });
      if (!response.ok) {
        throw new Error('Failed to fetch tag');
      }
      const data = await response.json();
      setTag(data as TagDetail);
    } catch (err) {
      console.error('Failed to fetch tag:', err);
      setError('Failed to load tag');
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchTag();
  };

  const handleEditCancel = () => {
    setShowEditForm(false);
  };

  const handleDelete = async () => {
    if (!name) return;

    if (window.confirm('このタグを削除してもよろしいですか？')) {
      try {
        setIsDeleting(true);
        const decodedName = decodeURIComponent(name);
        const response = await api.tags[':id'].$delete({ param: { id: decodedName } });
        if (!response.ok) {
          throw new Error('Failed to delete tag');
        }
        navigate('/tags');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'タグの削除に失敗しました');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleLogSuccess = (logId?: string) => {
    setShowLogForm(false);
    if (logId) {
      // Navigate to the newly created log's detail page
      navigate(`/logs/${logId}`);
    } else {
      // Fallback to logs list if no ID is provided
      navigate('/logs');
    }
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
        <X size={48} className="text-red-500" />
        <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="text-gray-600">{error}</p>
        <Link to="/tags">
          <Button variant="outline">タグ一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <TagIcon size={64} className="text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">タグが見つかりません</h2>
        <Link to="/tags">
          <Button variant="outline">タグ一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/tags">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              一覧に戻る
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Xへの共有ボタン（常に表示） */}
          <ShareToXButton
            text={`#${tag.name}`}
            url={window.location.href}
            hashtags={[tag.name]}
            size="sm"
            variant="outline"
            className="text-sky-600 border-sky-200 hover:bg-sky-50"
          />

          {isAuthenticated && (
            <>
              <Button
                onClick={() => setShowLogForm(!showLogForm)}
                size="sm"
                className={showLogForm ? 'bg-gray-500 hover:bg-gray-600' : 'btn-fresh'}
              >
                {showLogForm ? (
                  <>
                    <X size={16} className="mr-2" />
                    キャンセル
                  </>
                ) : (
                  <>
                    <PenLine size={16} className="mr-2" />
                    このタグでログを作成
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowEditForm(!showEditForm)}
                size="sm"
                variant="outline"
                className={
                  showEditForm
                    ? 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500'
                    : 'text-sky-600 border-sky-200 hover:bg-sky-50'
                }
              >
                {showEditForm ? (
                  <>
                    <X size={16} className="mr-2" />
                    キャンセル
                  </>
                ) : (
                  <>
                    <Edit size={16} className="mr-2" />
                    編集
                  </>
                )}
              </Button>
              <Button
                onClick={handleDelete}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    削除中...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    削除
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ログ作成フォーム */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <PenLine size={20} />
              <span>{tag.name} のログを作成</span>
            </DialogTitle>
          </DialogHeader>
          <LogForm
            key={tag.id}
            initialContent={formatTagHashtag(tag.name)}
            onSuccess={handleLogSuccess}
            onCancel={() => setShowLogForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* タグ編集フォーム */}
      {showEditForm && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PenLine size={20} />
              <span>タグを編集</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagForm tag={tag} onSuccess={handleEditSuccess} onCancel={handleEditCancel} />
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
        <CardContent className="space-y-4">
          {/* 説明 */}
          {tag.description && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={16} />
                説明
              </h3>
              <MarkdownRenderer content={tag.description} tags={tag.associations} />
            </div>
          )}

          {/* メタデータ */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">ℹ️ 情報</h3>
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
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 font-medium min-w-[100px]">🔄 更新日:</span>
                <span className="text-gray-900">
                  {new Date(tag.updated_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* 関連タグ */}
          {tag.associations && tag.associations.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🔗 関連タグ</h3>
              <div className="flex flex-wrap gap-2">
                {tag.associations.map((associatedTag) => (
                  <Link
                    key={associatedTag.id}
                    to={`/tags/${encodeURIComponent(associatedTag.name)}`}
                  >
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
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🔖 新着の被参照関連タグ</h3>
              <div className="flex flex-wrap gap-2">
                {tag.recent_referring_tags.map((referringTag) => (
                  <Link key={referringTag.id} to={`/tags/${encodeURIComponent(referringTag.name)}`}>
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
              <FileText size={20} />
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
