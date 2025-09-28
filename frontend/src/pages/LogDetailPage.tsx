import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { Log } from '@/models';
import { Button } from '@/components/ui/button';
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
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <p className="text-red-600 font-semibold">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-600">📝</span>
          </div>
          <p className="text-gray-600 font-semibold">Log not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <Link to="/logs">
          <Button variant="outline" className="flex items-center space-x-2 hover:bg-primary-50 hover:border-primary-300">
            <ArrowLeft size={16} />
            <span>Back to Logs</span>
          </Button>
        </Link>
      </div>

      <Card className="shadow-soft border-primary-100">
        <CardHeader className="border-b border-primary-100 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-t-xl">
          <CardTitle className="text-4xl font-bold text-primary-800 mb-2">
            {log.title}
          </CardTitle>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 space-y-2 sm:space-y-0">
            <p>
              Created: {new Date(log.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p>
              Last updated: {new Date(log.updated_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
            <div className="whitespace-pre-wrap">{log.content_md}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
