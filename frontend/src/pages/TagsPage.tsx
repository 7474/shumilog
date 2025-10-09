import { useEffect, useState } from 'react';
import { Lock, PenLine, X, Tag as TagIcon, Plus } from 'lucide-react';
import { api } from '@/services/api';
import { Tag } from '@/api-types';
import { TagForm } from '@/components/TagForm';
import { LogForm } from '@/components/LogForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { getMarkdownSummary } from '@/utils/markdownUtils';

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [logFormTag, setLogFormTag] = useState<Tag | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const fetchTags = async (search?: string, isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setSearching(true);
      }
      const { data, error: fetchError } = await api.GET('/tags', {
        params: { query: search ? { search } : {} },
      });
      if (fetchError || !data) {
        throw new Error('Failed to fetch tags');
      }
      setTags(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    fetchTags(undefined, true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTags(searchQuery || undefined, false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchTags(undefined, false);
  };

  const handleSuccess = async (tagId?: string) => {
    setShowForm(false);
    const wasCreating = !selectedTag;
    setSelectedTag(undefined);
    
    if (tagId && wasCreating) {
      // For newly created tags, navigate to the detail page
      // We need to fetch the tag to get its name for the URL
      try {
        const { data } = await api.GET('/tags/{id}', {
          params: { path: { id: tagId } },
        });
        if (data) {
          navigate(`/tags/${encodeURIComponent(data.name)}`);
          return;
        }
      } catch (err) {
        console.error('Failed to fetch created tag:', err);
      }
    }
    
    // For edits or if navigation failed, just refresh the tag list
    fetchTags();
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedTag(undefined);
  };

  const handleCreateLogWithTag = (tag: Tag, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    setLogFormTag(tag);
    setShowLogForm(true);
  };

  const handleLogSuccess = (logId?: string) => {
    setShowLogForm(false);
    setLogFormTag(null);
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

  // 未ログインでも閲覧は可能、編集操作のみログインが必要

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
        <Button onClick={fetchTags} variant="outline">
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl font-bold text-gray-900">タグ管理</h1>
          <p className="text-gray-600 mt-1">ログを整理するためのタグを管理しましょう</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'bg-gray-500 hover:bg-gray-600' : 'btn-fresh'}
          disabled={!isAuthenticated}
        >
          {!isAuthenticated ? (
            <>
              <Lock size={16} className="mr-2" />
              ログインして作成
            </>
          ) : showForm ? (
            <>
              <X size={16} className="mr-2" />
              キャンセル
            </>
          ) : (
            <>
              <Plus size={16} className="mr-2" />
              新しいタグを作成
            </>
          )}
        </Button>
      </div>

      {/* タグ作成フォーム */}
      {showForm && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {selectedTag ? <PenLine size={20} /> : <Plus size={20} />}
              <span>{selectedTag ? 'タグを編集' : '新しいタグを作成'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagForm tag={selectedTag} onSuccess={handleSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      )}

      {/* ログ作成フォーム */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <PenLine size={20} />
              <span>{logFormTag?.name} のログを作成</span>
            </DialogTitle>
          </DialogHeader>
          <LogForm
            key={logFormTag?.id}
            initialContent={logFormTag ? formatTagHashtag(logFormTag.name) : ''}
            onSuccess={handleLogSuccess}
            onCancel={() => {
              setShowLogForm(false);
              setLogFormTag(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 検索フォーム */}
      <Card className="card-fresh">
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="タグを検索（名前または説明）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="btn-fresh">
              検索
            </Button>
            {searchQuery && (
              <Button type="button" variant="outline" onClick={handleClearSearch}>
                クリア
              </Button>
            )}
          </form>
          {searching && searchQuery && <p className="text-sm text-gray-600 mt-2">「{searchQuery}」で検索中...</p>}
        </CardContent>
      </Card>

      {/* タグリスト */}
      <div className="space-y-4">
        {searching ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            <p className="text-gray-600 text-sm">検索中...</p>
          </div>
        ) : tags.length === 0 ? (
          <Card className="card-fresh text-center py-12">
            <CardContent className="space-y-4">
              <TagIcon size={64} className="mx-auto text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900">
                {searchQuery ? 'タグが見つかりません' : 'まだタグがありません'}
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? '検索条件に一致するタグがありません。別のキーワードで試してください。'
                  : '最初のタグを作成してログを整理しましょう！'}
              </p>
              {!searchQuery &&
                (isAuthenticated ? (
                  <Button onClick={() => setShowForm(true)} className="btn-fresh mt-4">
                    <Plus size={16} className="mr-2" />
                    最初のタグを作成
                  </Button>
                ) : (
                  <Link to="/login">
                    <Button className="btn-fresh mt-4">
                      <Lock size={16} className="mr-2" />
                      ログインしてタグを作成
                    </Button>
                  </Link>
                ))}
            </CardContent>
          </Card>
        ) : (
          <div className="grid-responsive">
            {tags.map((tag) => (
              <Card key={tag.id} className="card-fresh overflow-hidden">
                {/* Clickable card content area */}
                <Link to={`/tags/${encodeURIComponent(tag.name)}`}>
                  <div className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2 flex-1">
                          <span className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-400 to-fresh-400"></span>
                          <span>{tag.name}</span>
                        </CardTitle>
                        {/* Action button - positioned next to title */}
                        {isAuthenticated && (
                          <Button
                            onClick={(e) => handleCreateLogWithTag(tag, e)}
                            size="sm"
                            variant="ghost"
                            className="text-sky-600 hover:bg-sky-50 hover:text-sky-700 shrink-0"
                            title="このタグでログを作成"
                          >
                            <PenLine size={18} />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {tag.description && (
                      <CardContent className="pt-3">
                        <p className="text-gray-700 line-clamp-2">{getMarkdownSummary(tag.description || '', 150)}</p>
                      </CardContent>
                    )}
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
