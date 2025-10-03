import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Log } from '@/models';
import { LogForm } from '@/components/LogForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuth();

  const fetchLogs = async (search?: string) => {
    try {
      setLoading(true);
      const query = search ? { search } : {};
      const response = await api.logs.$get({ query });
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    setSelectedLog(undefined);
    fetchLogs(searchQuery || undefined);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(searchQuery || undefined);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchLogs();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this log?')) {
      try {
        const response = await api.logs[':id'].$delete({ param: { id } });
        if (!response.ok) {
          throw new Error('Failed to delete log');
        }
        fetchLogs();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete log');
      }
    }
  };

  const handleEdit = (log: Log) => {
    setSelectedLog(log);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedLog(undefined);
  };

  // 未ログインでも閲覧は可能、編集操作のみログインが必要

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
        <div className="text-4xl">❌</div>
        <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchLogs} variant="outline">
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
          <h1 className="text-3xl font-bold text-gray-900">📝 趣味ログ</h1>
          <p className="text-gray-600 mt-1">あなたの趣味活動を記録しましょう</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "bg-gray-500 hover:bg-gray-600" : "btn-fresh"}
          disabled={!isAuthenticated}
        >
          {!isAuthenticated ? '🔒 ログインして作成' : showForm ? '✕ キャンセル' : '✏️ 新しいログを作成'}
        </Button>
      </div>

      {/* 検索フォーム */}
      <Card className="card-fresh">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="🔍 ログを検索... (例: アニメ、進撃、RPG)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="btn-fresh">
              検索
            </Button>
            {searchQuery && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClearSearch}
              >
                クリア
              </Button>
            )}
          </form>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              「{searchQuery}」で検索中
            </p>
          )}
        </CardContent>
      </Card>

      {/* ログ作成フォーム */}
      {showForm && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{selectedLog ? '✏️' : '✨'}</span>
              <span>{selectedLog ? 'ログを編集' : '新しいログを作成'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogForm
              log={selectedLog}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      )}

      {/* ログリスト */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card className="card-fresh text-center py-12">
            <CardContent className="space-y-4">
              <div className="text-6xl">📝</div>
              <h3 className="text-xl font-semibold text-gray-900">まだログがありません</h3>
              <p className="text-gray-600">最初の趣味ログを作成してみましょう！</p>
              {isAuthenticated ? (
                <Button onClick={() => setShowForm(true)} className="btn-fresh mt-4">
                  ✨ 最初のログを作成
                </Button>
              ) : (
                <Link to="/login">
                  <Button className="btn-fresh mt-4">
                    🔒 ログインしてログを作成
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid-responsive">
            {logs.map((log) => (
              <Card key={log.id} className="card-fresh">
                <CardHeader>
                  <div className="flex flex-col space-y-3">
                    <CardTitle className="line-clamp-2">
                      <Link 
                        to={`/logs/${log.id}`}
                        className="text-gray-900 hover:text-fresh-600 transition-colors"
                      >
                        {log.title}
                      </Link>
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={() => handleEdit(log)}
                        size="sm"
                        variant="outline"
                        className="text-fresh-600 border-fresh-200 hover:bg-fresh-50"
                        disabled={!isAuthenticated}
                      >
                        ✏️ 編集
                      </Button>
                      <Button 
                        onClick={() => handleDelete(log.id.toString())}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={!isAuthenticated}
                      >
                        🗑️ 削除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-gray-700 line-clamp-3">
                    {log.content_md.substring(0, 150)}...
                  </p>
                  <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                    <span>📅 作成: {new Date(log.created_at).toLocaleDateString('ja-JP')}</span>
                    <span>🔄 更新: {new Date(log.updated_at).toLocaleDateString('ja-JP')}</span>
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