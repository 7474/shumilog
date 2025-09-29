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
      if (!id) {
        setError('Log ID not provided');
        setLoading(false);
        return;
      }

      try {
        const result = await api.logs.getById({ param: { id: parseInt(id) } });
        setLog(result);
      } catch (err) {
        console.error('Failed to fetch log:', err);
        setError('Failed to load log');
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id]);

  if (loading) {
    return (
      <div>
        <div>
          <div></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>
          <div>
            <span>⚠️</span>
          </div>
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!log) {
    return (
      <div>
        <div>
          <div>
            <span>📝</span>
          </div>
          <p>Log not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <Link to="/logs">
          <Button>
            <ArrowLeft size={16} />
            <span>Back to Logs</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {log.title}
          </CardTitle>
          <div>
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
        <CardContent>
          <div>
            <div>{log.content_md}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}