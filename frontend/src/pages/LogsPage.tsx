import { useEffect, useState } from 'react';
import { Lock, PenLine, X, FileText } from 'lucide-react';
import { api } from '@/services/api';
import { Log } from '@/api-types';
import { LogForm } from '@/components/LogForm';
import { LogCard } from '@/components/LogCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);
  const { isAuthenticated, user: _user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchLogs = async (search?: string, isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
        setOffset(0);
      } else {
        setSearching(true);
      }
      const { data, error: fetchError } = await api.GET('/logs', {
        params: { query: search ? { search, limit: 20, offset: 0 } : { limit: 20, offset: 0 } },
      });
      if (fetchError) {
        throw new Error('Failed to fetch logs');
      }
      setLogs(data.items);
      setHasMore(data.has_more);
      setOffset(data.limit); // Next offset will be current limit (20)
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

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const { data, error: fetchError } = await api.GET('/logs', {
        params: { 
          query: searchQuery 
            ? { search: searchQuery, limit: 20, offset } 
            : { limit: 20, offset }
        },
      });
      if (fetchError) {
        throw new Error('Failed to fetch more logs');
      }
      setLogs((prev) => [...prev, ...data.items]);
      setHasMore(data.has_more);
      setOffset(offset + data.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoadingMore(false);
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
        <Button onClick={() => fetchLogs()} variant="outline">
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex flex-wrap items-top gap-3 sm:gap-4">
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl font-bold text-gray-900">趣味ログ</h1>
          <p className="text-gray-600 mt-1">あなたの趣味活動を記録しましょう</p>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
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
      </div>

      {/* ログ作成フォーム */}
      {showForm && (
        <Card className="card-fresh space-y-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <PenLine size={20} />
                <span>{selectedLog ? 'ログを編集' : '新しいログを作成'}</span>
              </CardTitle>
              <Button
                type="button"
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={20} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LogForm log={selectedLog} onSuccess={handleSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      )}

      {/* 検索フォーム */}
      <Card className="card-fresh">
        <CardContent>
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
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-fresh"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      読み込み中...
                    </>
                  ) : (
                    'もっと見る'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
