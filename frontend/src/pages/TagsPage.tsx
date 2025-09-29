import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Tag } from '@/models';
import { TagForm } from '@/components/TagForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | undefined>(undefined);
  const { isAuthenticated } = useAuth();

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await api.tags.$get();
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setTags(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    setSelectedTag(undefined);
    fetchTags();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tag?')) {
      try {
        const response = await api.tags[':id'].$delete({ param: { id } });
        if (!response.ok) {
          throw new Error('Failed to delete tag');
        }
        fetchTags();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete tag');
      }
    }
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedTag(undefined);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900">ログインが必要です</h2>
        <p className="text-gray-600">タグを閲覧するにはログインしてください。</p>
        <Link to="/login">
          <Button className="btn-fresh">ログイン</Button>
        </Link>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">🏷️ タグ管理</h1>
          <p className="text-gray-600 mt-1">ログを整理するためのタグを管理しましょう</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "bg-gray-500 hover:bg-gray-600" : "btn-fresh"}
        >
          {showForm ? '✕ キャンセル' : '✨ 新しいタグを作成'}
        </Button>
      </div>

      {/* タグ作成フォーム */}
      {showForm && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{selectedTag ? '✏️' : '✨'}</span>
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

      {/* タグリスト */}
      <div className="space-y-4">
        {tags.length === 0 ? (
          <Card className="card-fresh text-center py-12">
            <CardContent className="space-y-4">
              <div className="text-6xl">🏷️</div>
              <h3 className="text-xl font-semibold text-gray-900">まだタグがありません</h3>
              <p className="text-gray-600">最初のタグを作成してログを整理しましょう！</p>
              <Button onClick={() => setShowForm(true)} className="btn-fresh mt-4">
                ✨ 最初のタグを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid-responsive">
            {tags.map((tag) => (
              <Card key={tag.id} className="card-fresh">
                <CardHeader>
                  <div className="flex flex-col space-y-3">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-400 to-fresh-400"></span>
                      <span>{tag.name}</span>
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={() => handleEdit(tag)}
                        size="sm"
                        variant="outline"
                        className="text-sky-600 border-sky-200 hover:bg-sky-50"
                      >
                        ✏️ 編集
                      </Button>
                      <Button 
                        onClick={() => handleDelete(tag.id.toString())}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        🗑️ 削除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-gray-700">
                    {tag.description || '説明なし'}
                  </p>
                  <div className="text-xs text-gray-500">
                    📅 作成日: {new Date(tag.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}