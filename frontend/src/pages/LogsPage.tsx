import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Log } from '@/models';
import { LogForm } from '@/components/LogForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Edit2, Trash2 } from 'lucide-react';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.logs.$get();
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
            {logs.map((log) => {
              const isOwner = user && log.author && log.author.id === user.id;
              
              return (
                <Card key={log.id} className="card-fresh overflow-hidden">
                  {/* Clickable card content area */}
                  <div 
                    className="cursor-pointer"
                    onClick={() => navigate(`/logs/${log.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="line-clamp-2 text-gray-900 hover:text-fresh-600 transition-colors">
                        {log.title}
                      </CardTitle>
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
                  </div>
                  
                  {/* Action buttons - only shown to log owner */}
                  {isOwner && (
                    <CardFooter className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 py-3 px-4">
                      <div className="flex items-center gap-2 w-full">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(log);
                          }}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-fresh-600 border-fresh-200 hover:bg-fresh-50 hover:border-fresh-300 transition-all duration-200 font-medium"
                        >
                          <Edit2 className="w-4 h-4 mr-1.5" />
                          編集
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(log.id.toString());
                          }}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-200 font-medium"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          削除
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}