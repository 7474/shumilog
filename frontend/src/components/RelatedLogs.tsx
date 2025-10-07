import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Log } from '@/api-types';
import { LogCard } from './LogCard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface RelatedLogsProps {
  logId: string;
}

export function RelatedLogs({ logId }: RelatedLogsProps) {
  const [relatedLogs, setRelatedLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelatedLogs = async () => {
      try {
        setLoading(true);
        const response = await api.logs[':logId'].related.$get({
          param: { logId },
          query: { limit: '10' },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch related logs');
        }

        const result = await response.json();
        setRelatedLogs(result.items);
      } catch (err) {
        console.error('Failed to fetch related logs:', err);
        setError('関連ログの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedLogs();
  }, [logId]);

  if (loading) {
    return (
      <Card className="card-fresh">
        <CardHeader>
          <CardTitle className="text-xl font-bold">関連するログ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fresh-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // エラーの場合は非表示
  }

  if (relatedLogs.length === 0) {
    return null; // 関連ログがない場合は非表示
  }

  return (
    <Card className="card-fresh">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">関連するログ</CardTitle>
        <p className="text-sm text-gray-600 mt-2">共通のタグを持つ他のログ</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {relatedLogs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
