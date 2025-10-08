import { useEffect, useState } from 'react';
import { Search, Lock, PenLine, X, FileText } from 'lucide-react';
import { api } from '@/services/api';
import { Log } from '@/api-types';
import { LogForm } from '@/components/LogForm';
import { LogCard } from '@/components/LogCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async (search?: string, isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setSearching(true);
      }
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
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    fetchLogs(undefined, true);
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    setSelectedLog(undefined);
    fetchLogs(searchQuery || undefined, false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(searchQuery || undefined, false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchLogs(undefined, false);
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
        <X size={48} className="text-red-500" />
        <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchLogs} variant="outline">
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">趣味ログ</h1>
          <p className="text-gray-600 mt-1">あなたの趣味活動を記録しましょう</p>
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
              <PenLine size={16} className="mr-2" />
              新しいログを作成
            </>
          )}
        </Button>
      </div>

      {/* ログ作成フォーム */}
      {showForm && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PenLine size={20} />
              <span>{selectedLog ? 'ログを編集' : '新しいログを作成'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogForm log={selectedLog} onSuccess={handleSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      )}

      {/* 検索フォーム */}
      <Card className="card-fresh">
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="ログを検索... (例: アニメ、進撃、RPG)"
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
          {searchQuery && <p className="text-sm text-gray-600 mt-2">「{searchQuery}」で検索中</p>}
        </CardContent>
      </Card>

      {/* ログリスト */}
      <div className="space-y-4">
        {searching ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fresh-500"></div>
            <p className="text-gray-600 text-sm">検索中...</p>
          </div>
        ) : logs.length === 0 ? (
          <Card className="card-fresh text-center py-12">
            <CardContent className="space-y-4">
              <FileText size={64} className="mx-auto text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900">まだログがありません</h3>
              <p className="text-gray-600">最初の趣味ログを作成してみましょう！</p>
              {isAuthenticated ? (
                <Button onClick={() => setShowForm(true)} className="btn-fresh mt-4">
                  <PenLine size={16} className="mr-2" />
                  最初のログを作成
                </Button>
              ) : (
                <Link to="/login">
                  <Button className="btn-fresh mt-4">
                    <Lock size={16} className="mr-2" />
                    ログインしてログを作成
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
