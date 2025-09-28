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
import { Link } from 'react-router-dom';

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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Logs</h1>
        <Button onClick={handleAddNew} size="lg">
          Create Log
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">
              {selectedLog ? 'Edit Log' : 'Create New Log'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogForm log={selectedLog} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-4 text-gray-600"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {logs.length === 0 && !showForm ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-xl">No logs found.</p>
          <p>Ready to add your first one?</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex justify-between items-center">
                <Link to={`/logs/${log.id}`} className="flex-grow">
                  <p className="font-semibold text-lg text-gray-800 hover:text-blue-600">
                    {log.title}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {log.content_md}
                  </p>
                </Link>
                <div className="flex items-center space-x-2 ml-4">
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
