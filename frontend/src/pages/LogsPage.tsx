import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Log } from '@/models';
import { LogForm } from '@/components/LogForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Logs</h1>
        <Button onClick={handleAddNew}>Create Log</Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{selectedLog ? 'Edit Log' : 'Create Log'}</CardTitle>
          </CardHeader>
          <CardContent>
            <LogForm log={selectedLog} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-4"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {logs.length === 0 && !showForm ? (
        <div className="text-center text-gray-500">No logs found.</div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <p>{log.content_md}</p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(log)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(log.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
