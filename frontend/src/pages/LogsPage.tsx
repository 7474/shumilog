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
    return (
      <div className="p-4 sm:p-6 min-h-[400px] flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 bg-primary-200 rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:justify-between sm:items-start">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Your Logs
          </h1>
          <p className="text-neutral-600 text-base sm:text-lg leading-relaxed">
            Capture and organize your hobby experiences
          </p>
        </div>
        <Button 
          onClick={handleAddNew} 
          size="lg" 
          className="shrink-0 shadow-gentle hover:shadow-medium self-start"
        >
          <span className="mr-2">✨</span>
          Create Log
        </Button>
      </div>

      {/* Form Section */}
      {showForm && (
        <Card className="mb-8 shadow-gentle border-primary-100/60 animate-slide-up">
          <CardHeader className="bg-gradient-to-r from-primary-50/80 to-secondary-50/80 rounded-t-2xl">
            <CardTitle className="text-xl sm:text-2xl text-primary-800 flex items-center">
              <span className="mr-2">{selectedLog ? '✏️' : '✨'}</span>
              {selectedLog ? 'Edit Log' : 'Create New Log'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <LogForm log={selectedLog} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-6 text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content Section */}
      {logs.length === 0 && !showForm ? (
        <div className="text-center py-16 sm:py-20 animate-fade-in">
          <div className="mb-8">
            <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-3xl flex items-center justify-center mb-6 shadow-soft">
              <span className="text-4xl sm:text-5xl">📝</span>
            </div>
          </div>
          <div className="space-y-3 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800">No logs yet</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Ready to capture your first hobby experience?
            </p>
            <div className="pt-4">
              <Button onClick={handleAddNew} size="lg" className="shadow-gentle hover:shadow-medium">
                <span className="mr-2">✨</span>
                Create Your First Log
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {logs.map((log, index) => (
            <Card 
              key={log.id} 
              className="hover:shadow-medium transition-all duration-300 group hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                  <Link to={`/logs/${log.id}`} className="flex-grow group-hover:text-primary-600 transition-colors duration-200">
                    <h3 className="font-bold text-lg sm:text-xl text-neutral-900 group-hover:text-primary-600 mb-2 leading-tight">
                      {log.title}
                    </h3>
                    <p className="text-neutral-600 text-sm sm:text-base line-clamp-3 leading-relaxed">
                      {log.content_md}
                    </p>
                  </Link>
                  <div className="flex items-center space-x-3 shrink-0 pt-2 sm:pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(log)}
                      className="hover:bg-primary-50 hover:border-primary-300 flex-1 sm:flex-none"
                    >
                      <span className="mr-1 sm:mr-2">✏️</span>
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(log.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <span className="mr-1 sm:mr-2">🗑️</span>
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
