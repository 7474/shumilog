import { useEffect, useState } from 'react';
import { Search, Lock, PenLine, X, Tag as TagIcon, Plus } from 'lucide-react';
import { api } from '@/services/api';
import { Tag } from '@/api-types';
import { TagForm } from '@/components/TagForm';
import { LogForm } from '@/components/LogForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

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
      const queryParams = search ? { query: { search } } : undefined;
      const response = await api.tags.$get(queryParams);
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
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

  // 検索クエリが変更されたときにタグを再取得（デバウンス処理付き）
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTags(searchQuery || undefined, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSuccess = () => {
    setShowForm(false);
    setSelectedTag(undefined);
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

  const handleLogSuccess = () => {
    setShowLogForm(false);
    setLogFormTag(null);
    navigate('/logs');
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
        <div className="text-4xl">❌</div>
        <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchTags} variant="outline">
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">タグ管理</h1>
          <p className="text-gray-600 mt-1">ログを整理するためのタグを管理しましょう</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "bg-gray-500 hover:bg-gray-600" : "btn-fresh"}
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

      {/* 検索ボックス */}
      <Card className="card-fresh">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search size={20} className="text-gray-400" />
            <Input
              type="text"
              placeholder="タグを検索（名前または説明）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {searchQuery && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-gray-600"
              >
                <X size={16} className="mr-1" />
                クリア
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              「{searchQuery}」で検索中...
            </p>
          )}
        </CardContent>
      </Card>

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
            <TagForm
              tag={selectedTag}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      )}

      {/* ログ作成フォーム */}
      {showLogForm && logFormTag && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus size={20} />
              <span>{logFormTag.name} のログを作成</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogForm
              initialContent={formatTagHashtag(logFormTag.name)}
              onSuccess={handleLogSuccess}
              onCancel={() => {
                setShowLogForm(false);
                setLogFormTag(null);
              }}
            />
          </CardContent>
        </Card>
      )}

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
                  : '最初のタグを作成してログを整理しましょう！'
                }
              </p>
              {!searchQuery && (
                isAuthenticated ? (
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
                )
              )}
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
                      <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                        <span className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-400 to-fresh-400"></span>
                        <span>{tag.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-gray-700 line-clamp-2">
                        {tag.description || '説明なし'}
                      </p>
                    </CardContent>
                  </div>
                </Link>
                
                {/* Action buttons - always visible for authenticated users */}
                {isAuthenticated && (
                  <CardFooter className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 py-3 px-4">
                    <Button
                      onClick={(e) => handleCreateLogWithTag(tag, e)}
                      size="sm"
                      className="btn-fresh w-full"
                    >
                      <Plus size={16} className="mr-2" />
                      このタグでログを作成
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}