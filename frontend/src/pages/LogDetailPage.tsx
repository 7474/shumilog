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
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4">Error: {error}</div>;
  }

  if (!log) {
    return <div className="container mx-auto p-4">Log not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <Link to="/logs">
          <Button variant="outline" className="flex items-center space-x-2">
            <ArrowLeft size={16} />
            <span>Back to Logs</span>
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="text-3xl font-bold text-gray-800">
            Log from {new Date(log.created_at).toLocaleDateString()}
          </CardTitle>
          <p className="text-sm text-gray-500">
            Last updated: {new Date(log.updated_at).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="prose prose-lg max-w-none">
            <p>{log.content_md}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
