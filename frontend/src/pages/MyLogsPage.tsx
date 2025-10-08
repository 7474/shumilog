import { useEffect, useState } from 'react';
import { Search, PenLine, X, FileText, Plus, BookOpen, LogOut } from 'lucide-react';
import { api } from '@/services/api';
import { Log } from '@/api-types';
import { LogForm } from '@/components/LogForm';
import { LogCard } from '@/components/LogCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function MyLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);
  const { isAuthenticated, clearAuth } = useAuth();
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
      const response = await api.users.me.logs.$get({ query });
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, redirect to login
          navigate('/login');
          return;
        }
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

  const handleSuccess = (logId?: string) => {
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
      const res = await api.auth.logout.$post();
      if (res.ok) {
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
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">マイログ</h1>
          <p className="text-gray-600 mt-1">あなたの趣味活動の記録を振り返る</p>
        </div>
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
      </div>

      {/* ログ作成フォーム */}
      {showForm && (
        <Card className="card-fresh">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {selectedLog ? <PenLine size={20} /> : <Plus size={20} />}
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
        <CardContent className="pt-6">
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
        <CardContent className="pt-6">
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
                <Plus size={16} className="mr-2" />
                最初のログを作成
              </Button>
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

      {/* ログアウト */}
      <div className="pt-8 border-t border-gray-200">
        <div className="flex justify-center">
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <LogOut size={16} className="mr-2" />
            <span>ログアウト</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
