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
import { useAuth } from '@/hooks/useAuth';

export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | undefined>(undefined);
  const { isAuthenticated } = useAuth();

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

  if (!isAuthenticated) {
    return <div>Please log in to view logs.</div>;
  }

  if (loading) {
    return (
      <div>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <Button onClick={fetchLogs}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1>Hobby Logs</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create New Log'}
        </Button>
      </div>

      {showForm && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedLog ? 'Edit Log' : 'Create New Log'}
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
        </div>
      )}

      <div>
        {logs.length === 0 ? (
          <Card>
            <CardContent>
              <div>
                <div>
                  <span>📝</span>
                </div>
                <h3>No logs yet</h3>
                <p>Create your first hobby log to get started!</p>
                <Button onClick={() => setShowForm(true)}>
                  Create First Log
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            {logs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <div>
                    <CardTitle>
                      <Link to={`/logs/${log.id}`}>
                        {log.title}
                      </Link>
                    </CardTitle>
                    <div>
                      <Button onClick={() => handleEdit(log)}>
                        Edit
                      </Button>
                      <Button onClick={() => handleDelete(log.id.toString())}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{log.content_md.substring(0, 150)}...</p>
                  <div>
                    <small>
                      Created: {new Date(log.created_at).toLocaleDateString()}
                    </small>
                    <small>
                      Updated: {new Date(log.updated_at).toLocaleDateString()}
                    </small>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}