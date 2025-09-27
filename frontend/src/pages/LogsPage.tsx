import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Log } from '@/models';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
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

    fetchLogs();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Logs</h1>
      <ul>
        {logs.map((log) => (
          <li key={log.id}>{log.title}</li>
        ))}
      </ul>
    </div>
  );
}
