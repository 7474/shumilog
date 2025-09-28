import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { Log } from '@/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLog = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await api.logs[':id'].$get({ param: { id } });
        if (!response.ok) {
          throw new Error('Failed to fetch log details');
        }
        const data = await response.json();
        setLog(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id]);

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4">Error: {error}</div>;
  }

  if (!log) {
    return <div className="container mx-auto p-4">Log not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Log Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>ID:</strong> {log.id}
            </p>
            <p>
              <strong>Content:</strong>
            </p>
            <div className="p-4 border rounded bg-gray-50">
              <p>{log.content_md}</p>
            </div>
            <p>
              <strong>Created At:</strong>{' '}
              {new Date(log.created_at).toLocaleString()}
            </p>
            <p>
              <strong>Updated At:</strong>{' '}
              {new Date(log.updated_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
