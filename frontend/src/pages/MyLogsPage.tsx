import { useEffect, useState } from 'react';
import { PenLine, X, FileText, LogOut, MoreVertical } from 'lucide-react';
import { api } from '@/services/api';
import { Log } from '@/api-types';
import { LogForm } from '@/components/LogForm';
import { LogCard } from '@/components/LogCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function MyLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);
  const { clearAuth } = useAuth();
  const navigate = useNavigate();
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
      const { data, error: fetchError, response } = await api.GET('/users/me/logs', {
        params: { query: search ? { search, limit: 20, offset: 0 } : { limit: 20, offset: 0 } },
      });
      if (fetchError || !data) {
        if (response?.status === 401) {
          // Not authenticated, redirect to login
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch logs');
      }
      setLogs(data.items);
      setHasMore(data.has_more);
      setOffset(data.limit);
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
      const { data, error: fetchError } = await api.GET('/users/me/logs', {
        params: { 
          query: searchQuery 
            ? { search: searchQuery, limit: 20, offset } 
            : { limit: 20, offset }
        },
      });
      if (fetchError || !data) {
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

  const handleSuccess = (_logId?: string) => {
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

  const handleLogout = async () => {
    try {
      const { error } = await api.POST('/auth/logout', {});
      if (!error) {
        clearAuth();
        navigate('/');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

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
        <Button onClick={() => fetchLogs(undefined, true)} variant="outline">
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
          <h1 className="text-3xl font-bold text-gray-900">マイログ</h1>
          <p className="text-gray-600 mt-1">あなたの趣味活動の記録を振り返る</p>
        </div>
        
        <div className="flex flex-wrap gap-2 ml-auto">
          {/* プライマリアクション: 新しいログを作成 */}
          <Button
            onClick={() => setShowForm(!showForm)}
            className={showForm ? 'bg-gray-500 hover:bg-gray-600' : 'btn-fresh'}
          >
            {showForm ? (
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

          {/* その他の操作 - ドロップダウンメニュー */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="default"
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer"
              >
                <LogOut size={16} className="mr-2" />
                <span>ログアウト</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ログ作成フォーム */}
      {showForm && (
        <Card className="card-fresh space-y-4">
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

      {/* 統計情報 */}
      <Card className="card-fresh bg-gradient-to-br from-fresh-50 to-sky-50">
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-fresh-600">{logs.length}</div>
              <div className="text-sm text-gray-600 mt-1">総ログ数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-sky-600">
                {logs.filter((log) => log.is_public).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">公開中</div>
            </div>
            <div className="text-center col-span-2 sm:col-span-1">
              <div className="text-2xl sm:text-3xl font-bold text-teal-600">
                {logs.filter((log) => !log.is_public).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">非公開</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <Button onClick={() => setShowForm(true)} className="btn-fresh mt-4">
                <PenLine size={16} className="mr-2" />
                最初のログを作成
              </Button>
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
