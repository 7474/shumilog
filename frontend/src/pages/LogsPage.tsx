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
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent mb-2">
            Logs
          </h1>
          <p className="text-gray-600 text-lg">Capture and organize your hobby experiences</p>
        </div>
        <Button onClick={handleAddNew} size="lg" className="shrink-0">
          Create Log
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 shadow-soft border-primary-100">
          <CardHeader className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-t-xl">
            <CardTitle className="text-2xl text-primary-800">
              {selectedLog ? 'Edit Log' : 'Create New Log'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <LogForm log={selectedLog} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-6 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {logs.length === 0 && !showForm ? (
        <div className="text-center text-gray-500 py-20">
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">📝</span>
            </div>
          </div>
          <p className="text-2xl font-semibold mb-2 text-gray-700">No logs found</p>
          <p className="text-lg">Ready to add your first hobby experience?</p>
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-6 flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
                <Link to={`/logs/${log.id}`} className="flex-grow">
                  <p className="font-semibold text-xl text-gray-800 hover:text-primary-600 transition-colors duration-200 mb-2 group-hover:text-primary-600">
                    {log.title}
                  </p>
                  <p className="text-gray-600 line-clamp-2 text-base">
                    {log.content_md}
                  </p>
                </Link>
                <div className="flex items-center space-x-3 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(log)}
                    className="hover:bg-primary-50 hover:border-primary-300"
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
