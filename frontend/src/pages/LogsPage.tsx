import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Log } from '@/models';
import { LogForm } from '@/components/LogForm';
import { Button } from '@/components/ui/button';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);

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
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
  };

  const handleEdit = (log: Log) => {
    setSelectedLog(log);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setSelectedLog(undefined);
    setShowForm(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Logs</h1>
        <Button onClick={handleAddNew}>Create Log</Button>
      </div>

      {showForm && (
        <div className="mb-8">
          <LogForm log={selectedLog} onSuccess={handleSuccess} />
          <Button variant="ghost" onClick={() => setShowForm(false)} className="mt-4">
            Cancel
          </Button>
        </div>
      )}

      {logs.length === 0 && !showForm ? (
        <div>No logs found.</div>
      ) : (
        <ul>
          {logs.map((log) => (
            <li key={log.id} className="mb-2 p-2 border rounded flex justify-between items-center">
              <span>{log.content_md}</span>
              <div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(log)} className="mr-2">
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(log.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
