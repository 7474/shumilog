import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PenLine, X, Trash2, FileText, Tag as TagIcon, Loader2, Edit, MoreVertical } from 'lucide-react';
import { api } from '@/services/api';
import { Tag, Log } from '@/api-types';
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
import { LogCard } from '@/components/LogCard';
import { TagForm } from '@/components/TagForm';
import { Advertisement } from '@/components/Advertisement';
import { useAuth } from '@/hooks/useAuth';
import { ShareToXButton } from '@/components/ShareToXButton';
import { useOgp, extractPlainText } from '@/hooks/useOgp';

interface TagDetail extends Tag {
  log_count: number;
  recent_logs: Log[];
  associated_tags: Tag[];
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logFormInitialContent, setLogFormInitialContent] = useState<string>('');
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
        const { data, error: fetchError } = await api.GET('/tags/{tagId}', {
          params: { path: { tagId: decodedName } },
        });
        if (fetchError || !data) {
          throw new Error('Failed to fetch tag');
        }
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
      const { data, error: fetchError } = await api.GET('/tags/{tagId}', {
        params: { path: { tagId: decodedName } },
      });
      if (fetchError || !data) {
        throw new Error('Failed to fetch tag');
      }
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

    try {
      setIsDeleting(true);
      const decodedName = decodeURIComponent(name);
      const { error } = await api.DELETE('/tags/{tagId}', {
        params: { path: { tagId: decodedName } },
      });
      if (error) {
        throw new Error('Failed to delete tag');
      }
      navigate('/tags');
    } catch (err) {
      console.error('Failed to delete tag:', err);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
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

  const handleCreateLogWithParentOnly = () => {
    if (!tag) return;
    setLogFormInitialContent(formatTagHashtag(tag.name));
    setShowLogForm(true);
  };

  const handleCreateLogWithParentAndChild = (childTag: Tag) => {
    if (!tag) return;
    const parentHashtag = formatTagHashtag(tag.name);
    const childHashtag = formatTagHashtag(childTag.name);
    setLogFormInitialContent(`${parentHashtag} ${childHashtag}`);
    setShowLogForm(true);
  };

  // OGPメタデータの設定（SSRと同じ内容）
  useOgp(tag ? {
    title: `#${tag.name}`,
    description: tag.description 
      ? extractPlainText(tag.description, 200)
      : `${tag.name}に関するログを探す`,
    url: window.location.href,
    type: 'website',
  } : {
    title: 'Shumilog',
    description: 'Your Personal Hobby Logger',
    url: window.location.href,
  });

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
      {/* ヘッダー: 戻るボタンと操作ボタン */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/tags">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>タグ一覧に戻る</span>
          </Button>
        </Link>

        <div className="flex flex-wrap gap-2 ml-auto">
          {/* プライマリアクション: このタグでログを作成（認証済みユーザーのみ） */}
          {isAuthenticated && (
            <Button
              onClick={() => {
                if (showLogForm) {
                  setShowLogForm(false);
                } else {
                  handleCreateLogWithParentOnly();
                }
              }}
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
          )}

          {/* Xへの共有ボタン（常に表示） */}
          <ShareToXButton
            text={`#${tag.name}`}
            url={window.location.href}
            hashtags={[tag.name]}
            size="sm"
            variant="outline"
            className="text-sky-600 border-sky-200 hover:bg-sky-50"
          />

          {/* 編集・削除操作（認証済みユーザーのみ）- ドロップダウンメニュー */}
          {isAuthenticated && (
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
                  onClick={() => setShowEditForm(!showEditForm)}
                  className="cursor-pointer"
                >
                  <Edit size={16} className="mr-2" />
                  <span>{showEditForm ? 'キャンセル' : '編集'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
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

      {/* ログ作成フォーム */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <PenLine size={20} />
              <span>{tag.name} のログを作成</span>
            </DialogTitle>
          </DialogHeader>
          <LogForm
            key={tag.id}
            initialContent={logFormInitialContent}
            onSuccess={handleLogSuccess}
            onCancel={() => setShowLogForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* タグ編集フォーム */}
      {showEditForm && (
        <Card className="card-fresh space-y-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <PenLine size={20} />
                <span>タグを編集</span>
              </CardTitle>
              <Button
                type="button"
                onClick={handleEditCancel}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={20} />
              </Button>
            </div>
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
              <MarkdownRenderer content={tag.description} tags={tag.associated_tags} />
            </div>
          )}

          {/* メタデータ */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">ℹ️ 情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 font-medium min-w-[100px]">📊 使用回数:</span>
                <span className="text-gray-900">{tag.log_count} 回</span>
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
          {tag.associated_tags && tag.associated_tags.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🔗 関連タグ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tag.associated_tags.map((associatedTag) => (
                  <div key={associatedTag.id} className="flex items-center gap-2">
                    {/* タグ名（タップで詳細ページへ） */}
                    <Link 
                      to={`/tags/${encodeURIComponent(associatedTag.name)}`}
                      className="flex-1 min-w-0"
                    >
                      <span className="inline-flex items-center space-x-1 px-3 py-2 bg-sky-50 text-sky-700 rounded-lg text-sm active:bg-sky-100 transition-colors w-full">
                        <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0"></span>
                        <span className="truncate">{associatedTag.name}</span>
                      </span>
                    </Link>
                    
                    {/* ログ作成ボタン（常時表示、モバイルでタップ可能） */}
                    {isAuthenticated && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleCreateLogWithParentAndChild(associatedTag);
                        }}
                        className="flex-shrink-0 bg-fresh-500 text-white rounded-lg p-2 active:bg-fresh-600 transition-colors shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={`${associatedTag.name}でログを作成`}
                        aria-label={`${associatedTag.name}でログを作成`}
                      >
                        <PenLine size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 被参照タグ（このタグを参照している他のタグ） */}
          {tag.recent_referring_tags && tag.recent_referring_tags.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🔖 被参照タグ</h3>
              <p className="text-xs text-gray-600 mb-2">このタグを参照している他のタグ</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tag.recent_referring_tags.map((referringTag) => (
                  <div key={referringTag.id} className="flex items-center gap-2">
                    {/* タグ名（タップで詳細ページへ） */}
                    <Link 
                      to={`/tags/${encodeURIComponent(referringTag.name)}`}
                      className="flex-1 min-w-0"
                    >
                      <span className="inline-flex items-center space-x-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm active:bg-purple-100 transition-colors w-full">
                        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0"></span>
                        <span className="truncate">{referringTag.name}</span>
                      </span>
                    </Link>
                    
                    {/* ログ作成ボタン（常時表示、モバイルでタップ可能） */}
                    {isAuthenticated && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleCreateLogWithParentAndChild(referringTag);
                        }}
                        className="flex-shrink-0 bg-fresh-500 text-white rounded-lg p-2 active:bg-fresh-600 transition-colors shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={`${referringTag.name}でログを作成`}
                        aria-label={`${referringTag.name}でログを作成`}
                      >
                        <PenLine size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 広告 */}
      {tag && <Advertisement type="tag" id={tag.name} />}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tag.recent_logs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">タグを削除しますか？</DialogTitle>
            <DialogDescription className="text-gray-700">
              このタグを削除すると、元に戻すことはできません。本当に削除してもよろしいですか？
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
